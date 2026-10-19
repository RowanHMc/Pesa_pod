from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistrationViewSet

router = DefaultRouter()

router.register("register", RegistrationViewSet, basename="register")


urlpatterns = [
    path("", include(router.urls)),
]
