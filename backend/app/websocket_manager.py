from __future__ import annotations

import asyncio
import json

from fastapi import WebSocket

from .models import SimulationSnapshot


class WebSocketManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.connections.discard(websocket)

    async def broadcast_snapshot(self, snapshot: SimulationSnapshot) -> None:
        await self._broadcast(snapshot.model_dump_json())

    async def broadcast_event(self, event_type: str, payload: dict) -> None:
        await self._broadcast(json.dumps({"type": event_type, "payload": payload}))

    async def _broadcast(self, message: str) -> None:
        stale: list[WebSocket] = []
        async with self._lock:
            for connection in self.connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    stale.append(connection)
            for connection in stale:
                self.connections.discard(connection)
