from django.shortcuts import render
from django.db import transaction

from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from pesapod.models import Membership
from .models import SavingsCycle
from .serializers import SavingsCycleSerializer

# Create your views here.

class SavingsCycleViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SavingsCycleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavingsCycle.objects.filter(
            chama__memberships__user=self.request.user,
            chama__memberships__is_active=True,
            chama__is_active=True,
        ).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        chama = serializer.validated_data["chama"]

        # Lock the chama when validating cycle creation
        chama = type(chama).objects.select_for_update().get(pk=chama.pk)

        is_chairperson = Membership.objects.filter(
            chama=chama,
            user=self.request.user,
            role=Membership.Role.CHAIRPERSON,
            is_active=True,
        ).exists()

        if not is_chairperson:
            raise PermissionDenied(
                "Only chairperson can create a sacing cycle"
            )
        if not chama.is_active:
            raise ValidationError(
                "This Chama is inactive"
            )
        if SavingsCycle.objects.filter(
            chama=chama,
            status__in=[
                SavingsCycle.Status.DRAFT,
                SavingsCycle.Status.ACTIVE,
            ],
        ).exists():
            raise ValidationError(
                "Chama already has an unfinished cycle"
            )

        serializer.save(created_by=self.request.user)

