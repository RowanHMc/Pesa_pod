from django.contrib import admin
from  django.contrib.auth.admin import UserAdmin
from .models import User

# Register your models here.
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    fieldsets = UserAdmin.fieldsets + (
        ("Contact Information",
          {'fields': (
              'phone_number',
          )}),
    )
    """
    when creating new user
    """
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Contact Information",
          {'fields': (
              'phone_number',
          )}),
    )
    list_display = (
        "phone_number",
        "username",
        "email",
        "is_staff",
        "is_active",
    )
    search_fields = ("phone_number", "username", "email")