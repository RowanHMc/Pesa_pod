from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User


class CustomUserCreationForm(UserCreationForm):
    # Django's stock forms are tied to auth.User, which is swapped out here,
    # so the admin needs forms that point at our User model.
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "phone_number")


class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm

    fieldsets = UserAdmin.fieldsets + (
        ("Contact & verification", {"fields": ("phone_number", "is_email_verified")}),
    )
    # Used when creating a user in the admin.
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "phone_number", "password1", "password2"),
            },
        ),
    )
    list_display = (
        "username",
        "email",
        "phone_number",
        "is_email_verified",
        "is_staff",
        "is_active",
    )
    list_filter = UserAdmin.list_filter + ("is_email_verified",)
    search_fields = ("username", "email", "phone_number")
