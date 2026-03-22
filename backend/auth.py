import os
import schwab
from dotenv import load_dotenv

load_dotenv()


def get_client():
    """Return an authenticated schwab-py client, auto-refreshing tokens as needed."""
    return schwab.auth.client_from_token_file(
        token_path=os.path.join(os.path.dirname(__file__), "tokens.json"),
        api_key=os.environ["SCHWAB_API_KEY"],
        app_secret=os.environ["SCHWAB_APP_SECRET"],
    )
