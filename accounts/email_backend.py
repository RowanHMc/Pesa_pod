
import base64
import json
import logging

from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


logger = logging.getLogger(__name__)

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


class GmailAPIEmailBackend(BaseEmailBackend):
    """
    Django email backend that sends messages through Gmail API.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently)
        self.service = None

    def _get_credentials(self):
        token_json = getattr(settings, "GMAIL_TOKEN_JSON", "")

        if token_json:
            token_info = json.loads(token_json)
        else:
            token_file = Path(settings.BASE_DIR) / "gmail_token.json"

            if not token_file.exists():
                raise ImproperlyConfigured(
                    "Gmail token file was not found."
                )

            with open(token_file, "r", encoding="utf-8") as file:
                token_info = json.load(file)

        credentials = Credentials.from_authorized_user_info(
            token_info,
            GMAIL_SCOPES,
        )

        if not credentials.valid:
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
            else:
                raise ImproperlyConfigured(
                    "Gmail credentials are invalid or expired. "
                    "Please authorize the Gmail account again."
                )

        return credentials

    def open(self):
        if self.service is not None:
            return False

        try:
            credentials = self._get_credentials()

            self.service = build(
                "gmail",
                "v1",
                credentials=credentials,
                cache_discovery=False,
            )

            return True

        except Exception:
            if not self.fail_silently:
                raise

            logger.exception("Could not connect to Gmail API.")
            return None

    def close(self):
        self.service = None

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        new_connection = self.open()

        if self.service is None:
            return 0

        sent_count = 0

        try:
            for email_message in email_messages:
                try:
                    mime_message = email_message.message()

                    raw_message = base64.urlsafe_b64encode(
                        mime_message.as_bytes()
                    ).decode("utf-8")

                    self.service.users().messages().send(
                        userId="me",
                        body={"raw": raw_message},
                    ).execute()

                    sent_count += 1

                except Exception:
                    if not self.fail_silently:
                        raise

                    logger.exception("Failed to send Gmail API email.")

        finally:
            if new_connection:
                self.close()

        return sent_count
