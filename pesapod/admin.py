from django.contrib import admin

from .models import Chama, ChamaInvitation, Membership


@admin.register(Chama)
class ChamaAdmin(admin.ModelAdmin):
    list_display = ("name", "created_by", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "created_by__username")
    raw_id_fields = ("created_by",)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "chama", "role", "is_active", "joined_at", "left_at")
    list_filter = ("role", "is_active")
    search_fields = ("user__username", "chama__name")
    raw_id_fields = ("user", "chama")


@admin.register(ChamaInvitation)
class ChamaInvitationAdmin(admin.ModelAdmin):
    list_display = ("invited_user", "chama", "status", "invited_by", "expires_at")
    list_filter = ("status",)
    search_fields = ("invited_user__username", "chama__name")
    raw_id_fields = ("chama", "invited_user", "invited_by", "reviewed_by")
