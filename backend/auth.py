import json
import os
import schwab
from dotenv import load_dotenv

load_dotenv()

TOKEN_PATH = os.path.join(os.path.dirname(__file__), "tokens.json")


def _write_tokens_from_env():
    """Write tokens.json from SCHWAB_TOKENS_B64 env var (base64-encoded to avoid corruption)."""
    import base64
    raw_b64 = os.environ.get("SCHWAB_TOKENS_B64")
    if raw_b64:
        decoded = base64.b64decode(raw_b64.strip()).decode("utf-8")
        data = json.loads(decoded)
        with open(TOKEN_PATH, "w") as f:
            json.dump(data, f)


def get_client():
    """Return an authenticated schwab-py client, auto-refreshing tokens as needed."""
    _write_tokens_from_env()
    return schwab.auth.client_from_token_file(
        token_path=TOKEN_PATH,
        api_key=os.environ["SCHWAB_API_KEY"],
        app_secret=os.environ["SCHWAB_APP_SECRET"],
    )
