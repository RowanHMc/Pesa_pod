from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DailyJobsView, NotificationViewSet

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("jobs/daily/", DailyJobsView.as_view(), name="daily-jobs"),
    path("", include(router.urls)),
]
