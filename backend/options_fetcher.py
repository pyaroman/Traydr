import asyncio
import httpx
import schwab

from .gex_calculator import SYMBOLS


async def fetch_all_symbols(client) -> dict[str, dict]:
    """
    Fetch options chains for all symbols sequentially with a small delay
    to stay well within the 120 req/min rate limit.
    Returns a dict of symbol -> raw chain response dict.
    """
    results = {}
    for symbol in SYMBOLS:
        try:
            resp = client.get_option_chain(
                symbol,
                contract_type=client.Options.ContractType.ALL,
                strike_count=80,
                include_underlying_quote=True,
            )
            resp.raise_for_status()
            results[symbol] = resp.json()
        except Exception as e:
            print(f"[options_fetcher] Error fetching {symbol}: {e}")
        await asyncio.sleep(0.5)
    return results
