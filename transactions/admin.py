from django.contrib import admin

from .models import Contribution, Payout, SavingsCycle, SavingsRound, Transaction


class ReadOnlyAdmin(admin.ModelAdmin):
    """Money records are changed only through the API, which keeps the audit
    trail and the locking rules. The admin can look but not touch."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SavingsCycle)
class SavingsCycleAdmin(ReadOnlyAdmin):
    list_display = ("chama", "frequency", "contribution_amount", "status", "start_date")
    list_filter = ("status", "frequency")
    search_fields = ("chama__name",)
    list_select_related = ("chama",)


@admin.register(SavingsRound)
class SavingsRoundAdmin(ReadOnlyAdmin):
    list_display = ("cycle", "round_number", "recipient", "due_date", "status")
    list_filter = ("status",)
    list_select_related = ("cycle__chama", "recipient__user")


@admin.register(Contribution)
class ContributionAdmin(ReadOnlyAdmin):
    list_display = ("membership", "round", "amount_due", "penalty_amount", "status")
    list_filter = ("status",)
    list_select_related = ("membership__user", "round__cycle__chama")


@admin.register(Transaction)
class TransactionAdmin(ReadOnlyAdmin):
    list_display = ("reference", "amount", "method", "status", "reported_by", "reviewed_by")
    list_filter = ("status", "method")
    search_fields = ("reference", "reported_by__username")
    list_select_related = ("reported_by", "reviewed_by")


@admin.register(Payout)
class PayoutAdmin(ReadOnlyAdmin):
    list_display = ("reference", "amount", "method", "status", "recorded_by")
    list_filter = ("status", "method")
    search_fields = ("reference",)
    list_select_related = ("recorded_by",)

