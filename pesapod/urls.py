from .views import ChamaViewSet, InvitationViewSet
from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

router.register("chamas", ChamaViewSet, basename="chama")
router.register("invitations", InvitationViewSet, basename="invitation")

urlpatterns = [
    path("", include(router.urls))
]


