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

class DarajaCheckoutRejected(Exception):
    """Daraja declined to create a checkout"""
    
def initiate_stk_push(
    amount,
    phone_number,
    account_reference,
    transaction_desc="Chama contribution",
    callback_url=None,
    ):
        """
        Initiate an M-Pesa STK Push request.
        This only starts the payment request.
        It does NOT confirm that payment was completed.
        """

        callback_url =callback_url or settings.DARAJA_CALLBACK_URL
        if not callback_url:
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
            "CallBackURL": callback_url,
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

        if not isinstance(data, dict):
            raise DarajaAuthenticationError("Daraja returned an invalid checkout response.")

        response_code = data.get("ResponseCode")
        if response_code is not None and str(response_code) != "0":
            raise DarajaCheckoutRejected("Daraja declined the checkout.")

        if str(response_code) != "0" or not all(
            isinstance(data.get(key), str) and 0 < len(data[key]) <= 100
            for key in ("CheckoutRequestID", "MerchantRequestID")
        ):
            raise DarajaAuthenticationError("Daraja did not return valid checkout IDs.")

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

def initiate_b2c_payout(*, amount, phone_number, result_url, timeout_url):
    """Submit a sandbox B2C payout and return Daraja's request identifiers."""
    if settings.DARAJA_ENVIRONMENT != "sandbox":
        raise ValueError("This B2C integration is configured for sandbox testing.")

    shortcode = settings.DARAJA_B2C_SHORTCODE
    initiator = settings.DARAJA_B2C_INITIATOR_NAME
    credential = settings.DARAJA_B2C_SECURITY_CREDENTIAL

    if not all((shortcode, initiator, credential)):
        raise ValueError("Configure the sandbox B2C credentials first.")

    if amount < 1 or amount != int(amount):
        raise ValueError("The payout must be at least KES 1 in whole shillings.")

    # The payout service will supply the recipient's normalized account number.
    phone_number = phone_number.removeprefix("+")
    if (
        len(phone_number) != 12
        or not phone_number.startswith(("2547", "2541"))
        or not phone_number.isascii()
        or not phone_number.isdigit()
    ):
        raise ValueError("The recipient must have a valid Kenyan mobile number.")

    access_token = get_access_token()
    payload = {
        "InitiatorName": initiator,
        "SecurityCredential": credential,
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": shortcode,
        "PartyB": phone_number,
        "Remarks": "Chama payout",
        "QueueTimeOutURL": timeout_url,
        "ResultURL": result_url,
        "Occasion": "Savings round",
    }

    try:
        response = requests.post(
            "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest",
            json=payload,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=(5, 30),
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as error:
        raise DarajaAuthenticationError(
            "Could not establish the outcome of the B2C request."
        ) from error

    if not isinstance(data, dict):
        raise DarajaAuthenticationError("Daraja returned an invalid B2C response.")

    response_code = data.get("ResponseCode")
    if response_code is not None and str(response_code) != "0":
        raise DarajaCheckoutRejected("Daraja declined the B2C request.")

    if str(response_code) != "0" or not all(
        isinstance(data.get(key), str) and 0 < len(data[key]) <= 100
        for key in ("ConversationID", "OriginatorConversationID")
    ):
        raise DarajaAuthenticationError("Daraja did not return valid B2C request IDs.")

    return data