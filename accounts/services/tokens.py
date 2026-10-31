from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)


def revoke_all_refresh_tokens(user):
    """Blacklist every outstanding refresh token the user holds.

    Used after a password change or reset so old sessions stop working.
    (Access tokens still live until they expire, so keep their lifetime short.)
    """
    live = OutstandingToken.objects.filter(
        user=user, blacklistedtoken__isnull=True
    )
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=token) for token in live],
        ignore_conflicts=True,
    )
