from django.core.management.base import BaseCommand

from pesapod.models import ChamaInvitation
from pesapod.services import expire_overdue


class Command(BaseCommand):
    help = "Mark invitations that passed their expiry date as expired. Safe to run daily."

    def handle(self, *args, **options):
        count = expire_overdue(ChamaInvitation.objects.all())
        self.stdout.write(self.style.SUCCESS(f"Expired {count} invitation(s)."))
