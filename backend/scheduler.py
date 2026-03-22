from .auth import get_client
from .options_fetcher import fetch_all_symbols
from .gex_calculator import calculate_gex, DISPLAY_NAMES
from .ws_manager import manager

# Mutable dict so main.py's reference stays valid after updates
latest_gex_cache: dict = {}


async def poll_and_broadcast() -> None:
    """Fetch options chains, calculate GEX for all symbols, broadcast to all WS clients."""
    try:
        client = get_client()
        chains = await fetch_all_symbols(client)

        payload: dict = {}
        for api_symbol, chain_data in chains.items():
            display = DISPLAY_NAMES.get(api_symbol, api_symbol)
            payload[display] = calculate_gex(chain_data)

        if payload:
            latest_gex_cache.clear()
            latest_gex_cache.update(payload)
            await manager.broadcast(payload)
            print(f"[scheduler] Broadcast GEX data for {list(payload.keys())}")
    except Exception as e:
        print(f"[scheduler] poll_and_broadcast error: {e}")
