from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SavingsCycleViewSet, ContributionViewSet, TransansactionViewSet

router = DefaultRouter()

router.register("cycles", SavingsCycleViewSet, basename="savings-cycle"),
router.register("contributions", ContributionViewSet, basename="contribution"),
router.register("payments", TransansactionViewSet, basename="payment"),

urlpatterns = [
    path("", include(router.urls)),    
]
