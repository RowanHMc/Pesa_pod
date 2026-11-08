import hmac
import logging
import uuid

from django.conf import settings
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import jobs, services
from .models import Notification, NotificationPreference
from .serializers import NotificationPreferenceSerializer, NotificationSerializer

logger = logging.getLogger(__name__)

UUID_REGEX = "[0-9a-fA-F-]{36}"


def _choice_param(request, name, choices):
    value = request.query_params.get(name)
    if not value:
        return None
    if value not in choices:
        raise ValidationError({name: [f"Choose one of: {', '.join(sorted(choices))}."]})
    return value


def _uuid_param(request, name):
    value = request.query_params.get(name)
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        raise ValidationError({name: ["Enter a valid UUID."]})


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """A person's own notification history. Members can mark notifications
    read but cannot delete them (old ones are cleaned up automatically)."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    lookup_value_regex = UUID_REGEX

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user).select_related(
            "chama"
        )
        unread = self.request.query_params.get("unread")
        if unread is not None:
            if unread.lower() not in ("true", "false"):
                raise ValidationError({"unread": ["Use true or false."]})
            queryset = queryset.filter(read_at__isnull=(unread.lower() == "true"))
        kind = _choice_param(self.request, "kind", Notification.Kind.values)
        if kind:
            queryset = queryset.filter(kind=kind)
        category = _choice_param(self.request, "category", Notification.Category.values)
        if category:
            queryset = queryset.filter(category=category)
        chama = _uuid_param(self.request, "chama")
        if chama:
            queryset = queryset.filter(chama_id=chama)
        return queryset

    @action(detail=False, methods=["get"], url_path="unread-count", url_name="unread-count")
    def unread_count(self, request):
        """For the badge. Add ?chama=<id> to count one chama only."""
        return Response({"unread": self.get_queryset().filter(read_at__isnull=True).count()})

    @action(detail=True, methods=["post"], url_path="read", url_name="read")
    def read(self, request, pk=None):
        notification = self.get_object()
        services.mark_read(Notification.objects.filter(pk=notification.pk))
        notification.refresh_from_db()
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all", url_name="read-all")
    def read_all(self, request):
        """Mark everything read, or one chama's with ?chama=<id>."""
        updated = services.mark_read(self.get_queryset())
        return Response({"marked_read": updated})

    @action(
        detail=False,
        methods=["get", "patch"],
        url_path="preferences",
        url_name="preferences",
    )
    def preferences(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)
        if request.method == "GET":
            return Response(NotificationPreferenceSerializer(preferences).data)
        serializer = NotificationPreferenceSerializer(
            preferences, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DailyJobsView(APIView):
    """Called once a day by an outside scheduler (a GitHub Actions workflow),
    because the free hosting tier has no cron. Protected by a shared secret in
    the X-Jobs-Token header. Safe to call twice: every step is idempotent."""

    authentication_classes = []
    permission_classes = []
    throttle_classes = []

    def post(self, request):
        expected = getattr(settings, "JOBS_SECRET_TOKEN", "")
        if not expected:
            return Response({"detail": "Daily jobs are not configured."}, status=503)
        provided = request.headers.get("X-Jobs-Token", "")
        if not hmac.compare_digest(provided.encode(), expected.encode()):
            return Response({"detail": "Invalid token."}, status=403)

        results = jobs.run_daily_jobs()
        failed = [name for name, result in results.items() if not result["ok"]]
        # A 500 makes the scheduler's run show as failed, so you hear about it.
        return Response({"ok": not failed, "steps": results}, status=500 if failed else 200)

