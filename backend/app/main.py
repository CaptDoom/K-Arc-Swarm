from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models import InjectPolicyRequest, StartSimulationRequest
from .service import service

settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/scenarios")
async def list_scenarios() -> list[dict]:
    return [scenario.model_dump() for scenario in service.engine.scenario_index.values()]


@app.post("/api/simulations")
async def start_simulation(request: StartSimulationRequest) -> dict[str, str]:
    if request.scenario_id is None and request.custom_policy is None:
        raise HTTPException(status_code=400, detail="Provide either scenario_id or custom_policy")
    if request.scenario_id is not None and request.scenario_id not in service.engine.scenario_index:
        raise HTTPException(status_code=404, detail="Scenario not found")

    run = service.engine.create_run(request)

    async def on_tick(snapshot) -> None:
        await service.websocket_manager.broadcast_snapshot(snapshot)

    asyncio.create_task(
        service.engine.run_ticks(
            run.simulation_id,
            on_tick=on_tick,
            tick_delay_seconds=max(0.1, run.tick_delay_ms / 1000),
        )
    )
    return {"simulation_id": run.simulation_id}


@app.get("/api/simulations/{simulation_id}")
async def get_simulation(simulation_id: str) -> dict:
    if simulation_id not in service.engine.runs:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return service.engine.snapshot(simulation_id).model_dump()


@app.post("/api/simulations/{simulation_id}/inject")
async def inject_policy(simulation_id: str, request: InjectPolicyRequest) -> dict[str, str | int]:
    if simulation_id not in service.engine.runs:
        raise HTTPException(status_code=404, detail="Simulation not found")
    run = service.engine.runs[simulation_id]
    if run.status == "completed":
        raise HTTPException(status_code=400, detail="Simulation already completed")

    scenario_id = request.scenario_id
    if request.custom_policy is not None:
        scenario = service.engine.create_custom_scenario(request.custom_policy)
        scenario_id = scenario.id

    if not scenario_id:
        raise HTTPException(status_code=400, detail="Provide either scenario_id or custom_policy")
    if scenario_id not in service.engine.scenario_index:
        raise HTTPException(status_code=404, detail="Scenario not found")

    service.engine.inject_policy(simulation_id, scenario_id, request.tick)
    scheduled_tick = max(request.tick, run.current_tick + 1)
    await service.websocket_manager.broadcast_event(
        "policy_injected",
        {"simulation_id": simulation_id, "scenario_id": scenario_id, "tick": scheduled_tick},
    )
    return {"status": "scheduled", "tick": scheduled_tick}


@app.get("/api/compare")
async def compare_scenarios() -> list[dict]:
    return [item.model_dump() for item in service.engine.compare_scenarios()]


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await service.websocket_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await service.websocket_manager.disconnect(websocket)
