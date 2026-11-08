from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from pesapod.models import Membership
from pesapod.permissions import get_active_membership

from .models import Contribution, Payout, SavingsCycle, SavingsRound, Transaction

Role = Membership.Role


def chama_id_of(obj):
    """The chama an object of this app belongs to."""
    if isinstance(obj, SavingsCycle):
        return obj.chama_id
    if isinstance(obj, SavingsRound):
        return obj.cycle.chama_id
    if isinstance(obj, Contribution):
        return obj.round.cycle.chama_id
    if isinstance(obj, Transaction):
        return obj.contribution.round.cycle.chama_id
    if isinstance(obj, Payout):
        return obj.round.cycle.chama_id
    raise TypeError(f"No chama for {type(obj).__name__}")


def has_role(user, chama_id, *roles):
    membership = get_active_membership(user, chama_id)
    return membership is not None and membership.role in roles


def require_role(user, chama_id, role, message):
    """The one place a role is enforced. Services call it after taking the
    chama lock, so a role that changed a moment ago is respected."""
    if not has_role(user, chama_id, role):
        raise PermissionDenied(message)


class _ChamaRole(BasePermission):
    """Early refusal before any lock is taken. It runs when the view calls
    get_object(), so every detail action must call it."""

    role = None
    message = "You do not have permission to do this in this chama."

    def has_object_permission(self, request, view, obj):
        return has_role(request.user, chama_id_of(obj), self.role)


class IsChairperson(_ChamaRole):
    role = Role.CHAIRPERSON
    message = "Only the chairperson can do this."


class IsTreasurer(_ChamaRole):
    role = Role.TREASURER
    message = "Only the treasurer can do this."


class IsPayoutRecipient(BasePermission):
    message = "Only the recipient of this payout can do this."

    def has_object_permission(self, request, view, obj):
        recipient = obj.round.recipient
        return recipient.is_active and recipient.user_id == request.user.id
