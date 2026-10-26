import africastalking
from django.conf import settings

def send_otp_sms(phone_number, otp):
    africastalking.initialize(
        settings.AT_USERNAME,
        settings.AT_API_KEY,
    )
    message = (
        f"Your Pesa Pod Verification cide is {otp},"
    )

    response =africastalking.SMS.send(
        message,
        [phone_number],
    )

    recipients = response.get("SMSMessageData", {}).get("Recipients",[])

    if not recipients or recipients[0].get("statusCode") != 101:
        raise RuntimeError("SMS provider did not accept the message")

    return response