"""
Main FastAPI Application for Electric Motor Digital Twin.
Initializes background physics simulation loop and WebSocket broadcaster.
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .api.endpoints import router as api_router, global_engine
from .database.connection import init_db
from .websocket.manager import ws_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("motor_digital_twin")

# Background simulation runner task
sim_task: asyncio.Task = None


async def simulation_loop():
    """
    Continuous background physics loop running at 10 Hz (dt = 0.1s).
    Steps physics equations, evaluates alerts, and broadcasts telemetry to all connected WebSocket clients.
    """
    logger.info("Starting background physics simulation loop at 10 Hz...")
    while True:
        try:
            if not global_engine.is_paused:
                snapshot = global_engine.step(dt=0.1)
                # Broadcast over WebSockets
                await ws_manager.broadcast_json(snapshot)
            await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            logger.info("Simulation loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
            await asyncio.sleep(0.5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite tables and launch simulation loop
    init_db()
    global sim_task
    if not os.environ.get("PYTEST_CURRENT_TEST"):
        sim_task = asyncio.create_task(simulation_loop())
    yield
    # Shutdown: cancel task
    if sim_task:
        sim_task.cancel()
        try:
            await sim_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Electric Motor Digital Twin & Predictive Maintenance Platform",
    description="Real-time mathematical induction motor simulation, condition monitoring, vibration FFT, and predictive maintenance.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite development & production builds
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(api_router, prefix="/api")


# WebSocket Endpoint for Real-Time Telemetry & Bidirectional Controls
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    # Immediately send initial state snapshot
    initial_snapshot = global_engine.step(dt=0.0)
    await websocket.send_json(initial_snapshot)

    try:
        while True:
            # Receive client messages / commands
            data = await websocket.receive_json()
            cmd_type = data.get("type", "").lower()

            if cmd_type == "start":
                global_engine.command_start()
            elif cmd_type == "stop":
                global_engine.command_stop()
            elif cmd_type == "emergency_stop":
                global_engine.command_emergency_stop()
            elif cmd_type == "reset":
                global_engine.command_reset()
            elif cmd_type == "speed":
                freq = float(data.get("frequency", 50.0))
                global_engine.command_set_speed(freq)
            elif cmd_type == "load":
                lp = float(data.get("load_pct", 75.0))
                global_engine.command_set_load(lp)
            elif cmd_type == "direction":
                d = data.get("direction", "Forward")
                global_engine.command_set_direction(d)

            # Echo updated state
            await websocket.send_json(global_engine.step(dt=0.0))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)


@app.get("/")
def root():
    return {
        "system": "Electric Motor Digital Twin Platform",
        "status": "Operational",
        "state": global_engine.state.value,
        "docs_url": "/docs",
        "telemetry_ws": "/ws/telemetry"
    }
