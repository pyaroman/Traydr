import json
import os
import schwab
from dotenv import load_dotenv

load_dotenv()

TOKEN_PATH = os.path.join(os.path.dirname(__file__), "tokens.json")


def _write_tokens_from_env():
    """If SCHWAB_TOKENS env var is set, parse it as JSON and write a clean tokens.json."""
    raw = os.environ.get("SCHWAB_TOKENS")
    if raw:
        # Strip all ASCII control characters that may have been injected during copy/paste
        import re
        clean = re.sub(r'[\x00-\x1f\x7f]', '', raw)
        data = json.loads(clean)
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
