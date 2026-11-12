import uuid

from django.conf import settings
from django.db import models


class Chama(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(max_length=150,)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_chamas",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def __str__(self):
        return self.name


class Membership(models.Model):
    class Role(models.TextChoices):
        CHAIRPERSON = "chairperson", "Chairperson"
        TREASURER = "treasurer", "Treasurer"
        MEMBER = "member", "Member"

    class LeftReason(models.TextChoices):
        LEFT = "left", "Left"
        REMOVED = "removed", "Removed"

    chama = models.ForeignKey(
        Chama,
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="chama_memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )
    # Reset to the time of the latest (re)join.
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    left_at = models.DateTimeField(null=True, blank=True)
    left_reason = models.CharField(
        max_length=10,
        choices=LeftReason.choices,
        blank=True,
        default="",
    )

    class Meta:
        ordering = ["joined_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["chama", "user"],
                name="unique_chama_membership",
            ),
            models.UniqueConstraint(
                fields=["chama"],
                condition=models.Q(role="chairperson", is_active=True),
                name="unique_active_chairperson",
            ),
            models.UniqueConstraint(
                fields=["chama"],
                condition=models.Q(role="treasurer", is_active=True),
                name="unique_active_treasurer",
            ),
            models.CheckConstraint(
                condition=models.Q(role__in=["chairperson", "treasurer", "member"]),
                name="valid_membership_role",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(is_active=True, left_at__isnull=True)
                    | models.Q(is_active=False, left_at__isnull=False)
                ),
                name="membership_departure_consistency",
            ),
            # Whoever leaves or is removed must not keep an office.
            models.CheckConstraint(
                condition=models.Q(is_active=True) | models.Q(role="member"),
                name="inactive_membership_is_plain_member",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.chama.name} ({self.role})"


class ChamaInvitation(models.Model):
    class Status(models.TextChoices):
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        AWAITING_ACCEPTANCE = "awaiting_acceptance", "Awaiting Acceptance"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"  # the chairperson said no
        DECLINED = "declined", "Declined"  # the invitee said no
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    # Statuses in which an invitation is still live.
    OPEN_STATUSES = (Status.PENDING_APPROVAL, Status.AWAITING_ACCEPTANCE)

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    chama = models.ForeignKey(
        Chama,
        on_delete=models.PROTECT,
        related_name="invitations",
    )
    invited_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_chama_invitations",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_chama_invitations",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_APPROVAL,
    )
    # The chairperson's decision (approve or reject).
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reviewed_chama_invitations",
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    # The invitee's answer (accept or decline).
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["chama", "invited_user"],
                condition=models.Q(
                    status__in=["pending_approval", "awaiting_acceptance"]
                ),
                name="unique_open_chama_invitation",
            ),
        ]

    def __str__(self):
        return f"{self.invited_user.username} - {self.chama.name} ({self.status})"
