import asyncio
from datetime import datetime, timezone

from .gex_calculator import SYMBOLS


async def fetch_candles(client) -> dict[str, dict]:
    """
    Fetch ~1 month of daily candles for all symbols from Schwab price history.
    Returns a dict of display_symbol -> { candles: [...], symbol }.
    """
    from .gex_calculator import DISPLAY_NAMES

    results = {}
    for symbol in SYMBOLS:
        try:
            resp = client.get_price_history(
                symbol,
                period_type=client.PriceHistory.PeriodType.MONTH,
                period=client.PriceHistory.Period.ONE_MONTH,
                frequency_type=client.PriceHistory.FrequencyType.DAILY,
                frequency=client.PriceHistory.Frequency.DAILY,
                need_extended_hours_data=False,
            )
            resp.raise_for_status()
            data = resp.json()
            display = DISPLAY_NAMES.get(symbol, symbol)

            candles = []
            for c in data.get("candles", []):
                candles.append({
                    "time": int(c["datetime"] / 1000),  # ms -> seconds epoch
                    "open": c["open"],
                    "high": c["high"],
                    "low": c["low"],
                    "close": c["close"],
                    "volume": c.get("volume", 0),
                })

            results[display] = {
                "symbol": display,
                "candles": candles,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            print(f"[price_fetcher] Error fetching {symbol}: {e}")
        await asyncio.sleep(0.5)

    return results
