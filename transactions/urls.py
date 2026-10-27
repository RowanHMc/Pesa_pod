from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SavingsCycleViewSet

router = DefaultRouter()

router.register("cycles", SavingsCycleViewSet, basename="savings-cycle"),

urlpatterns = [
    path("", include(router.urls))    
]
