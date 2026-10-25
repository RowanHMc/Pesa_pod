from .views import ChamaViewSet
from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

router.register("chamas", ChamaViewSet, basename="chama")

urlpatterns = [
    path("", include(router.urls))
]


