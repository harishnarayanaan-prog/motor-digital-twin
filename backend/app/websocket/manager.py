"""
WebSocket Connection Manager for Real-Time Telemetry Broadcasting and Bidirectional Commands.
"""

import json
from typing import List, Dict, Any
from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSockets and broadcasts real-time telemetry frames."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_json(self, data: Dict[str, Any]):
        if not self.active_connections:
            return

        json_str = json.dumps(data)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json_str)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)


ws_manager = ConnectionManager()
