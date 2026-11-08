from django.contrib import admin

from .models import Notification, NotificationPreference


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(ReadOnlyAdmin):
    list_display = ("recipient", "kind", "category", "title", "email_status", "created_at")
    list_filter = ("category", "kind", "email_status")
    search_fields = ("recipient__username", "title")
    list_select_related = ("recipient",)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(ReadOnlyAdmin):
    list_display = ("user", "email_tasks", "email_reminders", "email_updates")
    list_select_related = ("user",)

