from django.shortcuts import render
from django.utils import timezone
from django.db import transaction

from .models import Chama, ChamaInvitation
from .serializers import ChamaSerializer, ChamaInvitationSerializer

from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from .permisions import IsChamaChairpersonOrReadOnly



# Create your views here.
class ChamaViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ChamaSerializer
    permission_classes = [
        IsAuthenticated,
        IsChamaChairpersonOrReadOnly,
        ]

    def get_queryset(self):
        return Chama.objects.filter(
            memberships__user = self.request.user, # check if user is part of the chama
            memberships__is_active= True, # check if they have active membership
            is_active=True, # check if chama is active
        ).distinct()

    def perform_create(self, serializer):
        if not self.request.user.is_phone_verified:
            raise PermissionDenied(
                "Verify your Phone Number before creating the chama."
            )
        serializer.save()
        """retrieve chama via membership query so a user who is not part of it cannot get data on another chama"""
    @action(
        detail=True,
        methods=["post"],
        url_path="invitations",
    )
    def propose_invitation(self, request, pk=None):
        chama =self.get_object()

        serializer = ChamaInvitationSerializer(
            data = self.request.data,
            context = {
                "request": request,
                "chama": chama,
            },
        )
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()

        return Response(
            ChamaInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )

    """Invitation status"""
    @action(
        detail=True,
        methods=["post"],
        url_path=r"invitations/(?P<invitation_id>[^/.]+)/review",
    )
    @transaction.atomic
    def review_invitation(self, request, pk=None, invitation_id=None):
        chama = self.get_object()

        decision = request.data.get("decision")

        if decision not in ("approve", "reject"):
            return Response(
                {"detail": "Decision must be 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation = ChamaInvitation.objects.select_for_update().filter(
            id=invitation_id,
            chama=chama,
        ).first()

        if not invitation:
            return Response(
                {"detail": "Invitation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if invitation.status != ChamaInvitation.Status.PENDING_APPROVAL:
            return Response(
                {"detail": "This invitation has already been reviewed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if invitation.expires_at <= timezone.now():
            invitation.status = ChamaInvitation.Status.EXPIRED
            invitation.save(update_fields=["status"])

            return Response(
                {"detail": "This invitation has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = (
            ChamaInvitation.Status.AWAITING_ACCEPTANCE
            if decision == "approve"
            else ChamaInvitation.Status.REJECTED
        )

        if decision == "approve":
            invitation.approved_by = request.user
            invitation.approved_at = timezone.now()
        else:
            invitation.responded_at = timezone.now()

        invitation.save()

        return Response(
            {
                "id": invitation.id,
                "status": invitation.status,
                "detail": (
                    "Invitation approved successfully."
                    if decision == "approve"
                    else "Invitation rejected successfully."
                ),
            },
            status=status.HTTP_200_OK,
        )

