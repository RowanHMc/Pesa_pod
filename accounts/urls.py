from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistrationViewSet
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()

router.register("register", RegistrationViewSet, basename="register")


urlpatterns = [
    path("", include(router.urls)),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh")
]
