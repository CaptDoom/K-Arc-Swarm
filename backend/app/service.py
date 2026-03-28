from __future__ import annotations

from pathlib import Path

from .config import get_settings
from .data_loader import load_scenarios, load_seed_population
from .simulation import PopulationFactory, SimulationEngine
from .websocket_manager import WebSocketManager


class AppService:
    def __init__(self) -> None:
        settings = get_settings()
        data_dir = Path(settings.data_dir)
        scenarios = load_scenarios(data_dir / "scenarios.json")
        seed_population = load_seed_population(data_dir / "delhi_agents.csv")
        self.engine = SimulationEngine(scenarios=scenarios, population_factory=PopulationFactory(seed_population))
        self.websocket_manager = WebSocketManager()


service = AppService()
