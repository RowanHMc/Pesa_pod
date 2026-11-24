from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContributionViewSet,
    PayoutViewSet,
    SavingsCycleViewSet,
    SavingsRoundViewSet,
    TransactionViewSet,
    DarajaCallbackView,
    DarajaB2CTimeoutView,
    DarajaB2CResultView
)

router = DefaultRouter()
router.register("cycles", SavingsCycleViewSet, basename="savings-cycle")
router.register("rounds", SavingsRoundViewSet, basename="savings-round")
router.register("contributions", ContributionViewSet, basename="contribution")
router.register("payments", TransactionViewSet, basename="payment")
router.register("payouts", PayoutViewSet, basename="payout")

urlpatterns = [
    path("", include(router.urls)),
    path("daraja/stk-callback/", DarajaCallbackView.as_view(), name="daraja-stk-callback",),
    path("daraja/b2c-result/", DarajaB2CResultView.as_view(), name="daraja-b2c-result",),
    path("daraja/b2c-timeout/", DarajaB2CTimeoutView.as_view(), name="daraja-b2c-timeout",),
]

