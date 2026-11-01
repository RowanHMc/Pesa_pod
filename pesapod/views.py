from django.db import transaction
from django.db.models import Count, OuterRef, Q, Subquery
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import Chama, ChamaInvitation, Membership
from .permissions import (
    IsActiveMember,
    IsChairperson,
    get_active_membership,
)
from .serializers import (
    ChamaInvitationSerializer,
    ChamaSerializer,
    InvitationProposalSerializer,
    InvitationResponseSerializer,
    InvitationReviewSerializer,
    MembershipSerializer,
    MembershipTargetSerializer,
)
from .services import (
    expire_overdue,
    has_active_cycle,
    invitation_lifetime,
    lock_chama,
)

UUID_REGEX = "[0-9a-fA-F-]{36}"

Status = ChamaInvitation.Status
Role = Membership.Role

INVITATION_RELATED = ("chama", "invited_user", "invited_by", "reviewed_by")


def _reload_invitation(invitation):
    return ChamaInvitation.objects.select_related(*INVITATION_RELATED).get(
        pk=invitation.pk
    )


def _filter_by_status(queryset, value, default, allowed):
    value = value or default
    if value == "all":
        return queryset
    if value not in allowed:
        raise ValidationError(
            {"status": [f"Choose one of: {', '.join(sorted(allowed | {'all'}))}."]}
        )
    if value == "open":
        return queryset.filter(status__in=ChamaInvitation.OPEN_STATUSES)
    return queryset.filter(status=value)


def _deactivate(membership, reason):
    membership.is_active = False
    membership.left_at = timezone.now()
    membership.left_reason = reason
    membership.role = Role.MEMBER
    membership.save(update_fields=["is_active", "left_at", "left_reason", "role"])


def _get_active_member(chama, membership_id):
    member = (
        Membership.objects.select_for_update(of=("self",))
        .select_related("user")
        .filter(pk=membership_id, chama=chama, is_active=True)
        .first()
    )
    if member is None:
        raise ValidationError("Active member not found in this chama.")
    return member


def _forbid_during_cycle(chama, message):
    if has_active_cycle(chama.pk):
        raise ValidationError(message)


class ListResponseMixin:
    def list_response(self, queryset, serializer_class):
        context = self.get_serializer_context()
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(
                serializer_class(page, many=True, context=context).data
            )
        return Response(serializer_class(queryset, many=True, context=context).data)


class ChamaViewSet(
    ListResponseMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ChamaSerializer
    lookup_value_regex = UUID_REGEX

    # Who may do what. Anything not listed needs only a login, and the
    # queryset below already limits it to chamas the user belongs to.
    ACTION_PERMISSIONS = {
        "update": [IsChairperson],
        "partial_update": [IsChairperson],
        "review_invitation": [IsChairperson],
        "appoint_treasurer": [IsChairperson],
        "remove_treasurer": [IsChairperson],
        "transfer_chair": [IsChairperson],
        "remove_member": [IsChairperson],
        "propose_invitation": [IsActiveMember],
        "cancel_invitation": [IsActiveMember],
        "leave": [IsActiveMember],
    }

    def get_permissions(self):
        extra = self.ACTION_PERMISSIONS.get(self.action, [])
        return [IsAuthenticated()] + [permission() for permission in extra]

    def get_throttles(self):
        if self.action == "propose_invitation":
            self.throttle_scope = "invitation_propose"
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        my_chamas = Membership.objects.filter(user=user, is_active=True).values(
            "chama_id"
        )
        my_role = Membership.objects.filter(
            chama=OuterRef("pk"), user=user, is_active=True
        ).values("role")[:1]
        return (
            Chama.objects.filter(pk__in=my_chamas, is_active=True)
            .select_related("created_by")
            .annotate(
                member_count=Count(
                    "memberships", filter=Q(memberships__is_active=True)
                ),
                my_role=Subquery(my_role),
            )
        )

    @action(detail=True, methods=["get"], url_path="invitations")
    def invitations(self, request, pk=None):
        chama = self.get_object()
        expire_overdue(ChamaInvitation.objects.filter(chama=chama))

        queryset = ChamaInvitation.objects.filter(chama=chama).select_related(
            *INVITATION_RELATED
        )
        membership = get_active_membership(request.user, chama.pk)
        if membership is None or membership.role != Role.CHAIRPERSON:
            queryset = queryset.filter(invited_by=request.user)

        allowed = set(Status.values) | {"open"}
        queryset = _filter_by_status(
            queryset, request.query_params.get("status"), "open", allowed
        )
        return self.list_response(queryset, ChamaInvitationSerializer)

    @invitations.mapping.post
    def propose_invitation(self, request, pk=None):
        chama = self.get_object()
        serializer = InvitationProposalSerializer(
            data=request.data,
            context={"request": request, "chama": chama},
        )
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()
        return Response(
            ChamaInvitationSerializer(_reload_invitation(invitation)).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"invitations/(?P<invitation_id>" + UUID_REGEX + r")/review",
    )
    def review_invitation(self, request, pk=None, invitation_id=None):
        chama = self.get_object()
        serializer = InvitationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        approve = serializer.validated_data["decision"] == "approve"

        expire_overdue(ChamaInvitation.objects.filter(pk=invitation_id, chama=chama))

        with transaction.atomic():
            lock_chama(chama.pk)
            invitation = (
                ChamaInvitation.objects.select_for_update(of=("self",))
                .filter(pk=invitation_id, chama=chama)
                .first()
            )
            if invitation is None:
                raise NotFound("Invitation not found.")
            if invitation.status == Status.EXPIRED:
                raise ValidationError("This invitation has expired.")
            if invitation.status != Status.PENDING_APPROVAL:
                raise ValidationError("This invitation is not waiting for review.")

            now = timezone.now()
            invitation.reviewed_by = request.user
            invitation.reviewed_at = now
            if approve:
                invitation.status = Status.AWAITING_ACCEPTANCE
                # The invitee gets a full window from the moment of approval.
                invitation.expires_at = now + invitation_lifetime()
            else:
                invitation.status = Status.REJECTED
            invitation.save(
                update_fields=["status", "reviewed_by", "reviewed_at", "expires_at"]
            )

        return Response(ChamaInvitationSerializer(_reload_invitation(invitation)).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"invitations/(?P<invitation_id>" + UUID_REGEX + r")/cancel",
    )
    def cancel_invitation(self, request, pk=None, invitation_id=None):

        chama = self.get_object()
        expire_overdue(ChamaInvitation.objects.filter(pk=invitation_id, chama=chama))

        with transaction.atomic():
            lock_chama(chama.pk)
            invitation = (
                ChamaInvitation.objects.select_for_update(of=("self",))
                .filter(pk=invitation_id, chama=chama)
                .first()
            )
            if invitation is None:
                raise NotFound("Invitation not found.")
            if invitation.status not in ChamaInvitation.OPEN_STATUSES:
                raise ValidationError("Only open invitations can be cancelled.")

            membership = get_active_membership(request.user, chama.pk)
            is_chairperson = membership is not None and membership.role == Role.CHAIRPERSON
            own_pending = (
                invitation.invited_by_id == request.user.id
                and invitation.status == Status.PENDING_APPROVAL
            )
            if not (is_chairperson or own_pending):
                raise PermissionDenied("You cannot cancel this invitation.")

            invitation.status = Status.CANCELLED
            invitation.save(update_fields=["status"])

        return Response(ChamaInvitationSerializer(_reload_invitation(invitation)).data)

# members
    @action(detail=True, methods=["get"], url_path="members")
    def list_members(self, request, pk=None):
        """Active members; add ?include_left=true to include former members."""
        chama = self.get_object()
        queryset = Membership.objects.filter(chama=chama).select_related("user")
        include_left = request.query_params.get("include_left", "").lower()
        if include_left not in ("1", "true", "yes"):
            queryset = queryset.filter(is_active=True)
        queryset = queryset.order_by("-is_active", "joined_at", "id")
        return self.list_response(queryset, MembershipSerializer)

    @action(detail=True, methods=["post"], url_path="leave")
    def leave(self, request, pk=None):
        chama = self.get_object()
        with transaction.atomic():
            lock_chama(chama.pk)
            membership = (
                Membership.objects.select_for_update(of=("self",))
                .filter(chama=chama, user=request.user, is_active=True)
                .first()
            )
            if membership is None:
                raise ValidationError("You are not an active member of this chama.")
            if membership.role == Role.CHAIRPERSON:
                raise ValidationError(
                    "Transfer the chairperson role to another member before leaving."
                )
            _forbid_during_cycle(
                chama, "You cannot leave while the chama has an active savings cycle."
            )
            _deactivate(membership, Membership.LeftReason.LEFT)
        return Response({"detail": "You have left the chama."})

    @action(
        detail=True,
        methods=["post"],
        url_path=r"members/(?P<membership_id>[0-9]+)/remove",
    )
    def remove_member(self, request, pk=None, membership_id=None):
        chama = self.get_object()
        with transaction.atomic():
            lock_chama(chama.pk)
            member = _get_active_member(chama, membership_id)
            if member.role == Role.CHAIRPERSON:
                raise ValidationError(
                    "The chairperson cannot be removed. Transfer the role first."
                )
            _forbid_during_cycle(
                chama,
                "Members cannot be removed while the chama has an active savings cycle.",
            )
            _deactivate(member, Membership.LeftReason.REMOVED)
        return Response(
            MembershipSerializer(member, context=self.get_serializer_context()).data
        )

# appoint treasurer
    @action(detail=True, methods=["post"], url_path="appoint-treasurer")
    def appoint_treasurer(self, request, pk=None):
        chama = self.get_object()
        serializer = MembershipTargetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            lock_chama(chama.pk)
            member = _get_active_member(
                chama, serializer.validated_data["membership_id"]
            )
            if member.role == Role.CHAIRPERSON:
                raise ValidationError("The chairperson cannot be appointed treasurer.")
            if member.role == Role.TREASURER:
                raise ValidationError("This member is already the treasurer.")

            Membership.objects.filter(
                chama=chama, role=Role.TREASURER, is_active=True
            ).update(role=Role.MEMBER)
            member.role = Role.TREASURER
            member.save(update_fields=["role"])

        return Response(
            MembershipSerializer(member, context=self.get_serializer_context()).data
        )

    @action(detail=True, methods=["post"], url_path="remove-treasurer")
    def remove_treasurer(self, request, pk=None):
        chama = self.get_object()
        with transaction.atomic():
            lock_chama(chama.pk)
            treasurer = (
                Membership.objects.select_for_update(of=("self",))
                .select_related("user")
                .filter(chama=chama, role=Role.TREASURER, is_active=True)
                .first()
            )
            if treasurer is None:
                raise ValidationError("This chama has no treasurer.")
            treasurer.role = Role.MEMBER
            treasurer.save(update_fields=["role"])
        return Response(
            MembershipSerializer(treasurer, context=self.get_serializer_context()).data
        )

    @action(detail=True, methods=["post"], url_path="transfer-chair")
    def transfer_chair(self, request, pk=None):
        chama = self.get_object()
        serializer = MembershipTargetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            lock_chama(chama.pk)
            current = (
                Membership.objects.select_for_update(of=("self",))
                .filter(
                    chama=chama,
                    user=request.user,
                    is_active=True,
                    role=Role.CHAIRPERSON,
                )
                .first()
            )
            if current is None:
                raise PermissionDenied("Only the chairperson can transfer the role.")
            target = _get_active_member(
                chama, serializer.validated_data["membership_id"]
            )
            if target.pk == current.pk:
                raise ValidationError("You are already the chairperson.")

            # Demote first so the one-chairperson rule is never broken. If the
            # new chairperson was treasurer, that office becomes vacant.
            current.role = Role.MEMBER
            current.save(update_fields=["role"])
            target.role = Role.CHAIRPERSON
            target.save(update_fields=["role"])

        return Response(
            MembershipSerializer(target, context=self.get_serializer_context()).data
        )


class InvitationViewSet(
    ListResponseMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Invitations addressed to the logged-in user."""

    serializer_class = ChamaInvitationSerializer
    permission_classes = [IsAuthenticated]
    lookup_value_regex = UUID_REGEX


    LIST_STATUSES = {
        Status.AWAITING_ACCEPTANCE.value,
        Status.ACCEPTED.value,
        Status.DECLINED.value,
        Status.CANCELLED.value,
        Status.EXPIRED.value,
    }

    def get_queryset(self):

        visible = Q(
            status__in=[
                Status.AWAITING_ACCEPTANCE,
                Status.ACCEPTED,
                Status.DECLINED,
            ]
        ) | Q(
            status__in=[Status.CANCELLED, Status.EXPIRED],
            reviewed_at__isnull=False,
        )
        return (
            ChamaInvitation.objects.filter(invited_user=self.request.user)
            .filter(visible)
            .select_related(*INVITATION_RELATED)
        )

    def list(self, request, *args, **kwargs):
        """Awaiting your answer by default; use ?status=accepted|declined|
        cancelled|expired|all for history."""
        expire_overdue(ChamaInvitation.objects.filter(invited_user=request.user))
        queryset = _filter_by_status(
            self.get_queryset(),
            request.query_params.get("status"),
            Status.AWAITING_ACCEPTANCE.value,
            self.LIST_STATUSES,
        )
        return self.list_response(queryset, ChamaInvitationSerializer)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        invitation = self.get_object()
        serializer = InvitationResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        accept = serializer.validated_data["decision"] == "accept"

        expire_overdue(ChamaInvitation.objects.filter(pk=invitation.pk))

        with transaction.atomic():
            # Same lock order as every membership change: chama first.
            chama = lock_chama(invitation.chama_id)
            invitation = ChamaInvitation.objects.select_for_update(of=("self",)).get(
                pk=invitation.pk
            )
            if invitation.status == Status.EXPIRED:
                raise ValidationError("This invitation has expired.")
            if invitation.status != Status.AWAITING_ACCEPTANCE:
                raise ValidationError("This invitation is not awaiting your response.")

            if accept:
                if not chama.is_active:
                    raise ValidationError("This chama is no longer active.")

                _forbid_during_cycle(
                    chama,
                    "You cannot join while the chama has an active savings cycle.",
                )
                membership = (
                    Membership.objects.select_for_update(of=("self",))
                    .filter(chama=chama, user=request.user)
                    .first()
                )
                if membership is not None and membership.is_active:
                    raise ValidationError("You are already a member of this chama.")
                if membership is not None:
                    # Rejoining: bring the old membership back as a plain member.
                    membership.is_active = True
                    membership.left_at = None
                    membership.left_reason = ""
                    membership.role = Role.MEMBER
                    membership.joined_at = timezone.now()
                    membership.save(
                        update_fields=[
                            "is_active",
                            "left_at",
                            "left_reason",
                            "role",
                            "joined_at",
                        ]
                    )
                else:
                    Membership.objects.create(
                        chama=chama, user=request.user, role=Role.MEMBER
                    )
                invitation.status = Status.ACCEPTED
            else:
                invitation.status = Status.DECLINED

            invitation.responded_at = timezone.now()
            invitation.save(update_fields=["status", "responded_at"])

        return Response(ChamaInvitationSerializer(_reload_invitation(invitation)).data)
