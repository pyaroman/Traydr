import json
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .ws_manager import manager
from .scheduler import poll_and_broadcast, latest_gex_cache, latest_candles_cache


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initial poll — don't crash the server if it fails (e.g. missing env vars)
    try:
        await poll_and_broadcast()
    except Exception as e:
        print(f"[startup] Initial poll failed: {e}")

    scheduler = AsyncIOScheduler()
    scheduler.add_job(poll_and_broadcast, "interval", seconds=45, id="gex_poll")
    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(title="Traydr GEX API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/gex")
async def gex_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    if latest_gex_cache or latest_candles_cache:
        await websocket.send_text(json.dumps({"gex": latest_gex_cache, "candles": latest_candles_cache}))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
async def health():
    return {"status": "ok", "symbols_cached": list(latest_gex_cache.keys())}


@app.get("/api/candles/{symbol}")
async def get_candles(symbol: str, timeframe: str = "D"):
    """Fetch candles for a symbol at a given timeframe.
    timeframe: 5, 15, 30 (minutes) or D (daily)
    """
    from .auth import get_client
    from .gex_calculator import DISPLAY_NAMES
    from .session_levels import calculate_session_levels

    client = get_client()

    # Map display symbol back to API symbol
    api_symbol = symbol
    for api_sym, display in DISPLAY_NAMES.items():
        if display == symbol:
            api_symbol = api_sym
            break

    try:
        if timeframe == "D":
            resp = client.get_price_history(
                api_symbol,
                period_type=client.PriceHistory.PeriodType.MONTH,
                period=client.PriceHistory.Period.SIX_MONTHS,
                frequency_type=client.PriceHistory.FrequencyType.DAILY,
                frequency=client.PriceHistory.Frequency.DAILY,
                need_extended_hours_data=False,
            )
        else:
            freq_map = {
                "5": client.PriceHistory.Frequency.EVERY_FIVE_MINUTES,
                "15": client.PriceHistory.Frequency.EVERY_FIFTEEN_MINUTES,
                "30": client.PriceHistory.Frequency.EVERY_THIRTY_MINUTES,
            }
            freq = freq_map.get(timeframe, client.PriceHistory.Frequency.EVERY_FIVE_MINUTES)
            resp = client.get_price_history(
                api_symbol,
                period_type=client.PriceHistory.PeriodType.DAY,
                period=client.PriceHistory.Period.TEN_DAYS,
                frequency_type=client.PriceHistory.FrequencyType.MINUTE,
                frequency=freq,
                need_extended_hours_data=True,
            )

        resp.raise_for_status()
        data = resp.json()

        candles = []
        for c in data.get("candles", []):
            candles.append({
                "time": int(c["datetime"] / 1000),
                "open": c["open"],
                "high": c["high"],
                "low": c["low"],
                "close": c["close"],
                "volume": c.get("volume", 0),
            })

        # Calculate session levels from intraday data
        # For daily timeframe, fetch separate intraday data for levels
        if timeframe == "D":
            try:
                intraday_resp = client.get_price_history(
                    api_symbol,
                    period_type=client.PriceHistory.PeriodType.DAY,
                    period=client.PriceHistory.Period.FIVE_DAYS,
                    frequency_type=client.PriceHistory.FrequencyType.MINUTE,
                    frequency=client.PriceHistory.Frequency.EVERY_FIVE_MINUTES,
                    need_extended_hours_data=True,
                )
                intraday_resp.raise_for_status()
                intraday_data = intraday_resp.json()
                intraday_candles = [
                    {"time": int(c["datetime"] / 1000), "high": c["high"], "low": c["low"]}
                    for c in intraday_data.get("candles", [])
                ]
                levels = calculate_session_levels(intraday_candles)
            except Exception as e:
                print(f"[candles] Failed to fetch intraday for levels: {e}")
                levels = {"prev_day_high": None, "prev_day_low": None,
                          "overnight_high": None, "overnight_low": None}
        else:
            levels = calculate_session_levels(candles)

        return {"symbol": symbol, "candles": candles, "levels": levels}
    except Exception as e:
        return {"symbol": symbol, "candles": [], "levels": {}, "error": str(e)}


# Serve built React frontend (production only — skipped in dev)
_static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(_static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(_static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(os.path.join(_static_dir, "index.html"))
