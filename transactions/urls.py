from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContributionViewSet,
    PayoutViewSet,
    SavingsCycleViewSet,
    SavingsRoundViewSet,
    TransactionViewSet,
)

router = DefaultRouter()
router.register("cycles", SavingsCycleViewSet, basename="savings-cycle")
router.register("rounds", SavingsRoundViewSet, basename="savings-round")
router.register("contributions", ContributionViewSet, basename="contribution")
router.register("payments", TransactionViewSet, basename="payment")
router.register("payouts", PayoutViewSet, basename="payout")

urlpatterns = [
    path("", include(router.urls)),
]

