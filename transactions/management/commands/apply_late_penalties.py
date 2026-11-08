from django.core.management.base import BaseCommand

from transactions.services import apply_late_penalties


class Command(BaseCommand):
    help = (
        "Add the late penalty to contributions that are unpaid and unreported "
        "after their due date. Safe to run daily; does nothing while "
        "SAVINGS_LATE_PENALTY_AMOUNT is 0."
    )

    def handle(self, *args, **options):
        count = apply_late_penalties()
        self.stdout.write(self.style.SUCCESS(f"Penalised {count} contribution(s)."))
