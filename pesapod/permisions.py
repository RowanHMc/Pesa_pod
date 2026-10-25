from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Membership

class IsChamaChairpersonOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        return Membership.objects.filter(
            chama=obj,
            user=request.user,
            role=Membership.Role.CHAIRPERSON,
            is_active=True
        ).exists()



