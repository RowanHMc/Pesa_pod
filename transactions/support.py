
"""Shared setup (users, a chama, helper calls) for the transactions and
notifications tests. It holds no tests itself; it is named support.py so the
test runner does not mistake it for a test module."""
from itertools import count
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from pesapod.models import Chama, Membership

from .models import Contribution, SavingsCycle

Role = Membership.Role


# Fast hasher so the suite runs in seconds; never use this outside tests.
@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class TransactionsTestCase(TestCase):
    """alice is chairperson, bob is treasurer, carol and dave are members and
    eve is not in the chama. Membership ids rise in that order, so with the
    shuffle switched off (see activate) the payout order is alice, bob, carol,
    dave. Every member, the recipient included, contributes each round."""

    def setUp(self):
        cache.clear()
        self._refs = count(1)
        self.client = APIClient()
        self.alice = self.make_user("alice", "0722000111")
        self.bob = self.make_user("bob", "0722000222")
        self.carol = self.make_user("carol", "0722000333")
        self.dave = self.make_user("dave", "0722000444")
        self.eve = self.make_user("eve", "0722000555")
        self.chama = Chama.objects.create(name="Umoja", created_by=self.alice)
        self.ma = self.join(self.alice, Role.CHAIRPERSON)
        self.mb = self.join(self.bob, Role.TREASURER)
        self.mc = self.join(self.carol)
        self.md = self.join(self.dave)

    # --- people ---------------------------------------------------------
    def make_user(self, name, phone):
        return User.objects.create_user(
            username=name,
            email=f"{name}@example.com",
            phone_number=phone,
            password="Tr0ub4dor&3-horse",
            is_email_verified=True,
        )

    def join(self, user, role=Role.MEMBER, chama=None):
        return Membership.objects.create(chama=chama or self.chama, user=user, role=role)

    def as_user(self, user):
        self.client.force_authenticate(user)

    def today(self):
        return timezone.localdate()

    # --- cycle ----------------------------------------------------------
    def create_cycle(self, user=None, **overrides):
        self.as_user(user or self.alice)
        data = {
            "chama": str(self.chama.pk),
            "contribution_amount": "100.00",
            "frequency": "weekly",
            "start_date": self.today().isoformat(),
        }
        data.update(overrides)
        return self.client.post(reverse("savings-cycle-list"), data, format="json")

    def activate(self, cycle_id, order=None, user=None):
        """Activate with a fixed payout order (default: by membership id)."""
        self.as_user(user or self.alice)
        with mock.patch("transactions.services.secrets.SystemRandom") as rnd:
            if order is None:
                rnd.return_value.shuffle.side_effect = lambda items: None
            else:
                rnd.return_value.shuffle.side_effect = lambda items: items.sort(
                    key=order.index
                )
            return self.client.post(reverse("savings-cycle-activate", args=[cycle_id]))

    def running(self, order=None, **cycle_overrides):
        """An active cycle; returns (cycle, first round)."""
        r = self.create_cycle(**cycle_overrides)
        assert r.status_code == 201, r.data
        r = self.activate(r.data["id"], order=order)
        assert r.status_code == 200, r.data
        cycle = SavingsCycle.objects.get(chama=self.chama, status="active")
        return cycle, cycle.rounds.get(round_number=1)

    # --- payments -------------------------------------------------------
    def pay(self, user, contribution, amount=None, ref=None, method="mpesa"):
        self.as_user(user)
        return self.client.post(
            reverse("payment-list"),
            {
                "contribution": str(contribution.pk),
                "amount": str(amount if amount is not None else contribution.total_due),
                "method": method,
                "reference": ref or f"MP{next(self._refs)}",
            },
            format="json",
        )

    def confirm(self, payment_id, user=None):
        self.as_user(user or self.bob)
        return self.client.post(reverse("payment-confirm", args=[payment_id]))

    def reject(self, payment_id, reason="Not received", user=None):
        self.as_user(user or self.bob)
        return self.client.post(
            reverse("payment-reject", args=[payment_id]),
            {"rejection_reason": reason},
            format="json",
        )

    def contribution_of(self, round_, membership):
        return Contribution.objects.get(round=round_, membership=membership)

    def collect(self, round_):
        """Everyone pays and the treasurer confirms."""
        for c in Contribution.objects.filter(round=round_).select_related("membership__user"):
            c.refresh_from_db()
            r = self.pay(c.membership.user, c)
            assert r.status_code == 201, r.data
            r = self.confirm(r.data["id"])
            assert r.status_code == 200, r.data

    # --- payouts --------------------------------------------------------
    def record_payout(self, round_, user=None, ref=None):
        self.as_user(user or self.bob)
        return self.client.post(
            reverse("payout-list"),
            {
                "round": str(round_.pk),
                "method": "mpesa",
                "reference": ref or f"PO{next(self._refs)}",
            },
            format="json",
        )

    def answer_payout(self, payout_id, user, accept=True, reason="Nothing arrived"):
        self.as_user(user)
        if accept:
            return self.client.post(reverse("payout-confirm", args=[payout_id]))
        return self.client.post(
            reverse("payout-reject", args=[payout_id]),
            {"rejection_reason": reason},
            format="json",
        )

    def finish_round(self, round_):
        """Collect, pay out and have the recipient confirm. The next round
        (or the end of the cycle) follows automatically."""
        self.collect(round_)
        r = self.record_payout(round_)
        assert r.status_code == 201, r.data
        r = self.answer_payout(r.data["id"], round_.recipient.user)
        assert r.status_code == 200, r.data
