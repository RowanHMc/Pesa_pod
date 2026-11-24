import base64
import requests
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache


TOKEN_CACHE_KEY = "daraja_access_token"

class DarajaAuthenticationError(Exception):
    """Raised when Daraja authentication fails."""
    pass

def get_access_token():
    """
    Get a Daraja OAuth access token.
    Reuse a cached token until it is close to expiry.
    """

    # Reuse an existing token if available
    cached_token = cache.get(TOKEN_CACHE_KEY)

    if cached_token:
        return cached_token

    url = f"{settings.DARAJA_BASE_URL}/oauth/v1/generate"

    try:
        response = requests.get(
            url,
            params={
                "grant_type": "client_credentials"
            },
            auth=(
                settings.DARAJA_CONSUMER_KEY,
                settings.DARAJA_CONSUMER_SECRET,
            ),
            timeout=(5, 20),
        )

        response.raise_for_status()

    except requests.RequestException as error:
        raise DarajaAuthenticationError(
            f"Could not connect to Daraja: {error}"
        ) from error

    try:
        data = response.json()
    except ValueError as error:
        raise DarajaAuthenticationError(
            "Daraja returned an invalid response."
        ) from error

    access_token = data.get("access_token")

    if not access_token:
        raise DarajaAuthenticationError(
            f"Daraja did not return an access token: {data}"
        )

    # Token normally expires after approximately one hour.
    expires_in = int(data.get("expires_in", 3599))

    # Cache for slightly less than the actual expiry time.
    cache_timeout = max(expires_in - 60, 1)

    cache.set(
        TOKEN_CACHE_KEY,
        access_token,
        timeout=cache_timeout,
    )

    return access_token


def initiate_stk_push(
    amount,
    phone_number,
    account_reference,
    transaction_desc="Chama contribution",
):
    """
    Initiate an M-Pesa STK Push request.
    This only starts the payment request.
    It does NOT confirm that payment was completed.
    """

    if not settings.DARAJA_CALLBACK_URL:
        raise DarajaAuthenticationError(
            "Daraja callback URL has not been configured."
        )

    try:
        amount = int(amount)
    except (TypeError, ValueError) as error:
        raise ValueError("Payment amount must be a whole number.") from error

    if amount < 1:
        raise ValueError("Payment amount must be at least KES 1.")

    # Daraja expects the phone number without the leading plus sign.
    phone_number = str(phone_number).replace("+", "")

    if not phone_number.startswith("254") or len(phone_number) != 12:
        raise ValueError(
            "Phone number must be in the format 2547XXXXXXXX or 2541XXXXXXXX."
        )

    shortcode = settings.DARAJA_SHORTCODE

    # Generate timestamp in YYYYMMDDHHmmss format.
    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")

    # Generate the STK Push password.
    password_string = (
        f"{shortcode}{settings.DARAJA_PASSKEY}{timestamp}"
    )

    password = base64.b64encode(
        password_string.encode("utf-8")
    ).decode("utf-8")

    url = (
        f"{settings.DARAJA_BASE_URL}"
        "/mpesa/stkpush/v1/processrequest"
    )

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": settings.DARAJA_CALLBACK_URL,
        "AccountReference": str(account_reference)[:12],
        "TransactionDesc": str(transaction_desc)[:13],
    }

    try:
        access_token = get_access_token()

        response = requests.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=(5, 30),
        )

        response.raise_for_status()

    except requests.RequestException as error:
        raise DarajaAuthenticationError(
            f"STK Push request failed: {error}"
        ) from error

    try:
        data = response.json()
    except ValueError as error:
        raise DarajaAuthenticationError(
            "Daraja returned an invalid STK Push response."
        ) from error

    if data.get("ResponseCode") != "0":
        raise DarajaAuthenticationError(
            f"Daraja rejected the STK Push request: {data}"
        )

    return data

def query_stk_push(checkout_request_id):
    """Ask Daraja for the current result of an STK Push checkout."""
    shortcode = settings.DARAJA_SHORTCODE
    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{shortcode}{settings.DARAJA_PASSKEY}{timestamp}".encode("utf-8")
    ).decode("utf-8")

    access_token = get_access_token()

    try:
        response = requests.post(
            f"{settings.DARAJA_BASE_URL}/mpesa/stkpushquery/v1/query",
            json={
                "BusinessShortCode": shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id,
            },
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=(5, 30),
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as error:
        raise DarajaAuthenticationError(
            "Could not retrieve the STK Push status from Daraja."
        ) from error

    if (
        not isinstance(data, dict)
        or data.get("CheckoutRequestID") != checkout_request_id
    ):
        raise DarajaAuthenticationError(
            "Daraja did not return the requested checkout."
        )

    return data
