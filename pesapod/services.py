from datetime import timedelta

from django.apps import apps
from django.conf import settings
from django.utils import timezone

from .models import Chama, ChamaInvitation


def invitation_lifetime():
    return timedelta(days=getattr(settings, "CHAMA_INVITATION_DAYS", 7))


def lock_chama(chama_id):
    """Lock the chama row. Every action that changes membership or starts a
    cycle takes this lock first, so they cannot interleave."""
    return Chama.objects.select_for_update().get(pk=chama_id)


def has_active_cycle(chama_id):
    """True while the chama has a running savings cycle. Members may not join,
    leave or be removed during one, because the payout order is fixed."""
    SavingsCycle = apps.get_model("transactions", "SavingsCycle")
    return SavingsCycle.objects.filter(
        chama_id=chama_id, status=SavingsCycle.Status.ACTIVE
    ).exists()


def expire_overdue(queryset):
    """Mark open invitations past their expiry as EXPIRED. Returns how many."""
    return queryset.filter(
        status__in=ChamaInvitation.OPEN_STATUSES,
        expires_at__lte=timezone.now(),
    ).update(status=ChamaInvitation.Status.EXPIRED)
