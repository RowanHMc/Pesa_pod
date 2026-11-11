
import os
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CREDENTIALS_FILE = os.path.join(BASE_DIR, "gmail_credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "gmail_token.json")


def main():
    flow = InstalledAppFlow.from_client_secrets_file(
        CREDENTIALS_FILE,
        SCOPES,
    )

    credentials = flow.run_local_server(
        port=0,
        access_type="offline",
        prompt="consent",
    )

    with open(TOKEN_FILE, "w") as token:
        token.write(credentials.to_json())

    print("Gmail authorization successful!")
    print(f"Token saved to: {TOKEN_FILE}")


if __name__ == "__main__":
    main()
