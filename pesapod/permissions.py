from rest_framework.permissions import BasePermission

from .models import Membership


def get_active_membership(user, chama_id):
    """The user's active membership in the chama, or None."""
    return Membership.objects.filter(
        chama_id=chama_id, user=user, is_active=True
    ).first()


def _cached_membership(request, chama):
    cache = request.__dict__.setdefault("_chama_membership_cache", {})
    if chama.pk not in cache:
        cache[chama.pk] = get_active_membership(request.user, chama.pk)
    return cache[chama.pk]


class _HasRole(BasePermission):

    allowed_roles = ()
    message = "You do not have permission to do this in this chama."

    def has_object_permission(self, request, view, obj):
        membership = _cached_membership(request, obj)
        return membership is not None and membership.role in self.allowed_roles


class IsActiveMember(_HasRole):
    allowed_roles = (
        Membership.Role.CHAIRPERSON,
        Membership.Role.TREASURER,
        Membership.Role.MEMBER,
    )
    message = "You must be an active member of this chama."


class IsChairperson(_HasRole):
    allowed_roles = (Membership.Role.CHAIRPERSON,)
    message = "Only the chairperson can do this."


class IsTreasurer(_HasRole):
    allowed_roles = (Membership.Role.TREASURER,)
    message = "Only the treasurer can do this."




