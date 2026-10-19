from django.shortcuts import render
from rest_framework import mixins, viewsets
from rest_framework.permissions import AllowAny
from .serializers import RegistrationSerializer

# Create your views here.
class RegistrationViewSet(
    mixins.CreateModelMixin, # handles reg data, sanitize, save user
    viewsets.GenericViewSet, # CRUD handling
):
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny]