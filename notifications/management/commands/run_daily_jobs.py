from django.core.management.base import BaseCommand

from notifications.jobs import run_daily_jobs


class Command(BaseCommand):
    help = (
        "Run every daily job: penalties, reminders, the email digest, email "
        "retries and cleanup. Safe to run more than once a day."
    )

    def handle(self, *args, **options):
        for name, result in run_daily_jobs().items():
            if result["ok"]:
                self.stdout.write(self.style.SUCCESS(f"{name}: {result['count']}"))
            else:
                self.stdout.write(self.style.ERROR(f"{name}: {result['error']}"))
