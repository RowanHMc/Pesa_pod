from django.shortcuts import render
from .models import Chama
from .serializers import ChamaSerializer
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied


# Create your views here.
class ChamaViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ChamaSerializer
    permission_classes = [IsAuthenticated]

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
