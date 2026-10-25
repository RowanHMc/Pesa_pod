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

    
