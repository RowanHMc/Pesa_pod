import hashlib

from rest_framework.throttling import SimpleRateThrottle


class BodyFieldThrottle(SimpleRateThrottle):
    """Rate-limit by a value in the request body (e.g. the email address).

    IP-based throttles alone do not stop someone from flooding one victim's
    inbox or guessing one account's password from many IP addresses, so
    sensitive endpoints also throttle on the targeted email/username.
    The rate for each scope is set in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"].
    """

    body_field = None

    def get_cache_key(self, request, view):
        data = request.data
        if not isinstance(data, dict):
            return None
        value = str(data.get(self.body_field, "")).strip().lower()
        if not value:
            return None  # validation will reject the request anyway
        ident = hashlib.sha256(value.encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": ident}


class EmailCooldownThrottle(BodyFieldThrottle):
    scope = "email_cooldown"  # e.g. "1/min": minimum gap between emails
    body_field = "email"


class EmailDailyThrottle(BodyFieldThrottle):
    scope = "email_daily"  # e.g. "10/day": cap per email address
    body_field = "email"


class EmailConfirmThrottle(BodyFieldThrottle):
    scope = "email_confirm"  # e.g. "20/hour": code-entry attempts per email
    body_field = "email"


class LoginUsernameThrottle(BodyFieldThrottle):
    scope = "login_username"  # e.g. "10/hour": login attempts per username
    body_field = "username"
