from django.shortcuts import render
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
