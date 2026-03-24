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
    # Index options ($SPX, $NDX) have many more expirations, so a large
    # strike_count causes Schwab's gateway to return a 502 body-overflow.
    INDEX_SYMBOLS = {"$SPX", "$NDX"}

    results = {}
    for symbol in SYMBOLS:
        try:
            count = 40 if symbol in INDEX_SYMBOLS else 80
            resp = client.get_option_chain(
                symbol,
                contract_type=client.Options.ContractType.ALL,
                strike_count=count,
                include_underlying_quote=True,
            )
            resp.raise_for_status()
            results[symbol] = resp.json()
        except Exception as e:
            print(f"[options_fetcher] Error fetching {symbol}: {e}")
        await asyncio.sleep(0.5)
    return results
