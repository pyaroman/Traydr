import json
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .ws_manager import manager
from .scheduler import poll_and_broadcast, latest_gex_cache


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
    if latest_gex_cache:
        await websocket.send_text(json.dumps(latest_gex_cache))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
async def health():
    return {"status": "ok", "symbols_cached": list(latest_gex_cache.keys())}


# Serve built React frontend (production only — skipped in dev)
_static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(_static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(_static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(os.path.join(_static_dir, "index.html"))
