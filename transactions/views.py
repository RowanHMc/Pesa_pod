import uuid

from django.db.models import Count, OuterRef, Q, Subquery
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from pesapod.models import Membership

from . import services
from .models import Contribution, Payout, SavingsCycle, SavingsRound, Transaction
from .permissions import IsChairperson, IsPayoutRecipient, IsTreasurer
from .serializers import (
    ContributionSerializer,
    CycleCancelSerializer,
    PayoutSerializer,
    RejectionSerializer,
    SavingsCycleDetailSerializer,
    SavingsCycleSerializer,
    SavingsCycleUpdateSerializer,
    SavingsRoundSerializer,
    TransactionSerializer,
    ConfirmOnBehalfSerializer,
)

UUID_REGEX = "[0-9a-fA-F-]{36}"




def _my_chama_ids(user, role=None):
    memberships = Membership.objects.filter(user=user, is_active=True)
    if role is not None:
        memberships = memberships.filter(role=role)
    return memberships.values("chama_id")


def _uuid_param(request, name):
    """A UUID query parameter, or None. A malformed one is a 400, not a 500."""
    value = request.query_params.get(name)
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        raise ValidationError({name: ["Enter a valid UUID."]})


def _status_param(request, choices):
    value = request.query_params.get("status")
    if not value:
        return None
    if value not in choices:
        raise ValidationError(
            {"status": [f"Choose one of: {', '.join(sorted(choices))}."]}
        )
    return value


class PaginatedActionMixin:
    def list_response(self, queryset, serializer_class):
        context = self.get_serializer_context()
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(
                serializer_class(page, many=True, context=context).data
            )
        return Response(serializer_class(queryset, many=True, context=context).data)


class RoleScopedMixin:
    """Per-action extra permissions, as in the pesapod app."""

    ACTION_PERMISSIONS = {}

    def get_permissions(self):
        extra = self.ACTION_PERMISSIONS.get(self.action, [])
        return [IsAuthenticated()] + [permission() for permission in extra]


def cycle_queryset(user):
    latest_round = (
        SavingsRound.objects.filter(cycle=OuterRef("pk"))
        .order_by("-round_number")
        .values("round_number")[:1]
    )
    return (
        SavingsCycle.objects.filter(
            chama_id__in=_my_chama_ids(user), chama__is_active=True
        )
        .select_related("chama")
        .annotate(current_round=Subquery(latest_round))
    )


def round_queryset(user):
    payout_status = (
        Payout.objects.filter(round=OuterRef("pk"))
        .order_by("-created_at")
        .values("status")[:1]
    )
    return (
        SavingsRound.objects.filter(
            cycle__chama_id__in=_my_chama_ids(user), cycle__chama__is_active=True
        )
        .select_related("cycle", "recipient__user")
        .annotate(
            contribution_count=Count("contributions", distinct=True),
            paid_count=Count(
                "contributions",
                filter=Q(contributions__status=Contribution.Status.PAID),
                distinct=True,
            ),
            payout_status=Subquery(payout_status),
        )
    )


CONTRIBUTION_RELATED = (
    "membership__user",
    "round__cycle__chama",
)

class SavingsCycleViewSet(
    RoleScopedMixin,
    PaginatedActionMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SavingsCycleSerializer
    lookup_value_regex = UUID_REGEX

    ACTION_PERMISSIONS = {
        "partial_update": [IsChairperson],
        "activate_cycle": [IsChairperson],
        "cancel": [IsChairperson],
    }

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SavingsCycleDetailSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = cycle_queryset(self.request.user)
        chama = _uuid_param(self.request, "chama")
        if chama:
            queryset = queryset.filter(chama_id=chama)
        requested = _status_param(self.request, SavingsCycle.Status.values)
        if requested:
            queryset = queryset.filter(status=requested)
        return queryset

    def perform_create(self, serializer):
        # The service takes the chama lock, checks the role and the rules.
        serializer.instance = services.create_cycle(
            self.request.user, **serializer.validated_data
        )

    def partial_update(self, request, *args, **kwargs):
        """Fix a draft (amount, frequency, start date). PATCH only."""
        cycle = self.get_object()
        serializer = SavingsCycleUpdateSerializer(
            cycle, data=request.data, partial=True, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        cycle = services.update_draft_cycle(
            request.user, cycle.pk, serializer.validated_data
        )
        return Response(
            SavingsCycleDetailSerializer(
                cycle, context=self.get_serializer_context()
            ).data
        )

    @action(detail=True, methods=["post"], url_path="activate", url_name="activate")
    def activate_cycle(self, request, pk=None):
        cycle = self.get_object()
        cycle, first_round = services.activate_cycle(request.user, cycle.pk)
        return Response(
            {
                "detail": "Savings cycle activated successfully.",
                "status": cycle.status,
                "number_of_rounds": cycle.number_of_rounds,
                "payout_order": cycle.payout_order,
                "current_round": first_round.round_number,
                "recipient": first_round.recipient_id,
                "contributions_created": first_round.contributions.count(),
            }
        )

    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel(self, request, pk=None):
        cycle = self.get_object()
        serializer = CycleCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cycle, summary = services.cancel_cycle(
            request.user, cycle.pk, serializer.validated_data.get("reason", "")
        )
        return Response(
            {
                "detail": "Savings cycle cancelled.",
                "status": cycle.status,
                **summary,
            }
        )

    @action(detail=True, methods=["get"], url_path="rounds", url_name="rounds")
    def list_rounds(self, request, pk=None):
        """All rounds generated so far for this cycle."""
        cycle = self.get_object()
        queryset = round_queryset(request.user).filter(cycle=cycle)
        return self.list_response(queryset, SavingsRoundSerializer)


class SavingsRoundViewSet(
    RoleScopedMixin,
    PaginatedActionMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Visible to every active member of the chama."""

    serializer_class = SavingsRoundSerializer
    lookup_value_regex = UUID_REGEX

    ACTION_PERMISSIONS = {"list_contributions": [IsTreasurer]}

    def get_queryset(self):
        queryset = round_queryset(self.request.user)
        cycle = _uuid_param(self.request, "cycle")
        if cycle:
            queryset = queryset.filter(cycle_id=cycle)
        requested = _status_param(self.request, SavingsRound.Status.values)
        if requested:
            queryset = queryset.filter(status=requested)
        return queryset

    @action(
        detail=True,
        methods=["get"],
        url_path="contributions",
        url_name="contributions",
    )
    def list_contributions(self, request, pk=None):
        """Every contribution of this round, for the treasurer.
        Add ?status=pending to see who still owes."""
        round_ = self.get_object()
        queryset = (
            Contribution.objects.filter(round=round_)
            .select_related(*CONTRIBUTION_RELATED)
            .order_by("membership__user__username")
        )
        requested = _status_param(request, Contribution.Status.values)
        if requested:
            queryset = queryset.filter(status=requested)
        return self.list_response(queryset, ContributionSerializer)


class ContributionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """The logged-in member's own contributions."""

    serializer_class = ContributionSerializer
    permission_classes = [IsAuthenticated]
    lookup_value_regex = UUID_REGEX

    def get_queryset(self):
        queryset = Contribution.objects.filter(
            membership__user=self.request.user
        ).select_related(*CONTRIBUTION_RELATED)
        round_id = _uuid_param(self.request, "round")
        if round_id:
            queryset = queryset.filter(round_id=round_id)
        cycle_id = _uuid_param(self.request, "cycle")
        if cycle_id:
            queryset = queryset.filter(round__cycle_id=cycle_id)
        requested = _status_param(self.request, Contribution.Status.values)
        if requested:
            queryset = queryset.filter(status=requested)
        return queryset.order_by("-round__due_date", "id")


class TransactionViewSet(
    RoleScopedMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Members see their own payment reports. The treasurer sees every report
    in their chama and is the only one who can confirm or reject them."""

    serializer_class = TransactionSerializer
    lookup_value_regex = UUID_REGEX

    ACTION_PERMISSIONS = {
        "confirm_payment": [IsTreasurer],
        "reject_payment": [IsTreasurer],
    }

    def get_queryset(self):
        user = self.request.user
        queryset = (
            Transaction.objects.filter(
                Q(contribution__membership__user=user)
                | Q(
                    contribution__round__cycle__chama_id__in=_my_chama_ids(
                        user, Membership.Role.TREASURER
                    )
                )
            )
            .select_related(
                "contribution__round__cycle__chama",
                "reported_by",
                "reviewed_by",
            )
        )
        requested = _status_param(self.request, Transaction.Status.values)
        if requested:
            queryset = queryset.filter(status=requested)
        round_id = _uuid_param(self.request, "round")
        if round_id:
            queryset = queryset.filter(contribution__round_id=round_id)
        return queryset

    def perform_create(self, serializer):
        data = serializer.validated_data
        serializer.instance = services.report_payment(
            self.request.user,
            data["contribution"].pk,
            data["amount"],
            data["method"],
            data["reference"],
        )

    def _review(self, request, confirm, reason=""):
        payment = self.get_object()
        payment = services.review_payment(
            request.user, payment.pk, confirm=confirm, reason=reason
        )
        payment = self.get_queryset().get(pk=payment.pk)
        return Response(self.get_serializer(payment).data)

    @action(detail=True, methods=["post"], url_path="confirm", url_name="confirm")
    def confirm_payment(self, request, pk=None):
        return self._review(request, confirm=True)

    @action(detail=True, methods=["post"], url_path="reject", url_name="reject")
    def reject_payment(self, request, pk=None):
        serializer = RejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._review(
            request,
            confirm=False,
            reason=serializer.validated_data["rejection_reason"],
        )


class PayoutViewSet(
    RoleScopedMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """The treasurer records a payout; the recipient confirms or rejects it.
    Creating one needs the treasurer role, which the service checks."""

    serializer_class = PayoutSerializer
    lookup_value_regex = UUID_REGEX

    ACTION_PERMISSIONS = {
        "confirm_payout": [IsPayoutRecipient],
        "reject_payout": [IsPayoutRecipient],
    }

    def get_queryset(self):
        user = self.request.user
        queryset = Payout.objects.filter(
            Q(round__recipient__user=user)
            | Q(
                round__cycle__chama_id__in=_my_chama_ids(
                    user, Membership.Role.TREASURER
                )
            )
        ).select_related(
            "round__cycle__chama", "round__recipient__user", "recorded_by"
        )
        requested = _status_param(self.request, Payout.Status.values)
        if requested:
            queryset = queryset.filter(status=requested)
        round_id = _uuid_param(self.request, "round")
        if round_id:
            queryset = queryset.filter(round_id=round_id)
        return queryset

    def perform_create(self, serializer):
        data = serializer.validated_data
        serializer.instance = services.record_payout(
            self.request.user, data["round"].pk, data["method"], data["reference"]
        )

    def _respond(self, request, accept, reason=""):
        payout = self.get_object()
        payout = services.respond_to_payout(
            request.user, payout.pk, accept=accept, reason=reason
        )
        payout = self.get_queryset().get(pk=payout.pk)
        return Response(self.get_serializer(payout).data)

    @action(detail=True, methods=["post"], url_path="confirm", url_name="confirm")
    def confirm_payout(self, request, pk=None):
        return self._respond(request, accept=True)

    @action(detail=True, methods=["post"], url_path="reject", url_name="reject")
    def reject_payout(self, request, pk=None):
        serializer = RejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._respond(
            request,
            accept=False,
            reason=serializer.validated_data["rejection_reason"],
        )
# notifications
    @action(
        detail=True,
        methods=["post"],
        url_path="confirm-on-behalf",
        url_name="confirm-on-behalf",
    )
    def confirm_on_behalf(self, request, pk=None):
        """The chairperson confirms for a recipient who has not answered after
        the escalation period (3 days by default). A note is required."""
        payout = self.get_object()
        serializer = ConfirmOnBehalfSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payout = services.confirm_payout_on_behalf(
            request.user, payout.pk, serializer.validated_data["note"]
        )
        payout = self.get_queryset().get(pk=payout.pk)
        return Response(self.get_serializer(payout).data)

