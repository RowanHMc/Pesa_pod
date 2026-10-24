from django.contrib import admin
from .models import Chama, ChamaInvitation, Membership

# Register your models here.

@admin.register(Chama)
class ChamaAdmin(admin.ModelAdmin):
    list_display=(
        "name",
        "created_by",
        "is_active",
        "created_at",
    )
    list_filter =("is_active", "created_at")
    search_fields=("name", "created_by__username")

    readonly_fields=(
        "id",
        "created_at",
        "updated_at",
    )

@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display =(
        "user",
        "chama",
        "role",
        "is_active",
        "joined_at",
    )
    list_filter= ("role", "is_active")
    search_fields=(
        "user__username",
        "chama__name",
    )
    readonly_fields=("joined_at",)