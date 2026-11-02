"""PULSE FastAPI Application Entry Point."""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.init_db import init_database
from app.websocket.manager import ConnectionManager
from app.api import health, video, traffic, controller, intent, simulation, experiments, reports, demo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pulse")

manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    logger.info("PULSE backend starting up...")
    await init_database()
    # Start background telemetry broadcast
    task = asyncio.create_task(telemetry_broadcast_loop(manager))
    logger.info("PULSE backend ready.")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("PULSE backend shut down.")


app = FastAPI(
    title="PULSE API",
    description="Preference-driven Urban Light Signal Engine - Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(video.router, prefix="/api/video")
app.include_router(traffic.router, prefix="/api/traffic")
app.include_router(controller.router, prefix="/api/controller")
app.include_router(intent.router, prefix="/api/intent")
app.include_router(simulation.router, prefix="/api/simulation")
app.include_router(experiments.router, prefix="/api/experiments")
app.include_router(reports.router, prefix="/api/reports")
app.include_router(demo.router, prefix="/api/demo")


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """Real-time telemetry WebSocket endpoint."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; data is pushed by background task
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def telemetry_broadcast_loop(mgr: ConnectionManager):
    """Background task: broadcast traffic state every second."""
    from app.services.traffic_service import get_current_traffic_state
    while True:
        try:
            await asyncio.sleep(1.0)
            if mgr.active_connections:
                state = get_current_traffic_state()
                await mgr.broadcast(json.dumps(state))
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Telemetry broadcast error: {e}")

