"""
Run this script ONCE to complete the OAuth2 browser login and write tokens.json.
After this, main.py auto-refreshes tokens silently.

Usage:
    source backend/.venv/bin/activate
    python backend/bootstrap_auth.py
"""
import os
import schwab
from dotenv import load_dotenv

load_dotenv()

token_path = os.path.join(os.path.dirname(__file__), "tokens.json")

schwab.auth.client_from_login_flow(
    api_key=os.environ["SCHWAB_API_KEY"],
    app_secret=os.environ["SCHWAB_APP_SECRET"],
    callback_url=os.environ["SCHWAB_CALLBACK_URL"],
    token_path=token_path,
)

print(f"Auth complete. Tokens written to {token_path}")
