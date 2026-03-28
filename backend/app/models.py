from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AgentMode(str, Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    INTERACTING = "interacting"
    PROTESTING = "protesting"
    RECOVERING = "recovering"


@dataclass(slots=True)
class MemoryRecord:
    tick: int
    event_type: str
    impact: float
    note: str


@dataclass(slots=True)
class Persona:
    age_group: str
    income_level: str
    education: str
    occupation: str
    lat: float
    lng: float
    political_leaning: float
    economic_views: float
    social_views: float
    risk_tolerance: float


@dataclass(slots=True)
class AgentState:
    sentiment: float = 0.0
    economic_status: float = 0.0
    trust_in_government: float = 0.5
    mode: AgentMode = AgentMode.IDLE


@dataclass(slots=True)
class CitizenAgent:
    agent_id: int
    cluster_weight: int
    persona: Persona
    state: AgentState = field(default_factory=AgentState)
    influence_links: dict[int, float] = field(default_factory=dict)
    short_term_memory: list[MemoryRecord] = field(default_factory=list)
    long_term_memory: list[MemoryRecord] = field(default_factory=list)

    def similarity(self, other: "CitizenAgent") -> float:
        persona_distance = (
            abs(self.persona.political_leaning - other.persona.political_leaning)
            + abs(self.persona.economic_views - other.persona.economic_views)
            + abs(self.persona.social_views - other.persona.social_views)
        ) / 3
        return max(0.0, 1.0 - persona_distance)

    def remember(self, record: MemoryRecord) -> None:
        self.short_term_memory.append(record)
        if len(self.short_term_memory) > 12:
            self.long_term_memory.append(self.short_term_memory.pop(0))


class ScenarioParameters(BaseModel):
    price_change: float | None = None
    cash_support: float | None = None
    service_quality: float | None = None
    target_groups: list[str] = Field(default_factory=list)
    sentiment_shock: float = 0.0
    trust_shift: float = 0.0
    economic_stress: float = 0.0


class PolicyScenario(BaseModel):
    id: str
    name: str
    description: str
    domain: str
    parameters: ScenarioParameters


class CustomPolicyInput(BaseModel):
    name: str
    description: str
    domain: str = "economic"
    target_groups: list[str] = Field(default_factory=list)
    sentiment_shock: float = 0.0
    trust_shift: float = 0.0
    economic_stress: float = 0.0


class InjectPolicyRequest(BaseModel):
    scenario_id: str | None = None
    custom_policy: CustomPolicyInput | None = None
    tick: int = 0


class StartSimulationRequest(BaseModel):
    name: str = "Delhi baseline"
    scenario_id: str | None = "fuel_price_hike"
    custom_policy: CustomPolicyInput | None = None
    agent_count: int = 1000
    tick_hours: int = 6
    total_ticks: int = 24
    tick_delay_ms: int = 750


class SentimentBand(BaseModel):
    positive: float
    neutral: float
    negative: float


class HeatPoint(BaseModel):
    lat: float
    lng: float
    sentiment: float
    trust: float
    weight: int


class SimulationMetrics(BaseModel):
    tick: int
    sentiment_mean: float
    trust_mean: float
    economic_mean: float
    protest_risk: float
    cohesion: float
    acceptance_rate: float
    sentiment_band: SentimentBand
    heatmap: list[HeatPoint]
    event_log: list[str]
    forecast: dict[str, Any]
    cluster_summary: list[dict[str, Any]]


class SimulationSnapshot(BaseModel):
    simulation_id: str
    status: str
    name: str
    current_tick: int
    total_ticks: int
    tick_hours: int
    tick_delay_ms: int
    metrics: SimulationMetrics


class ScenarioComparison(BaseModel):
    scenario_id: str
    sentiment_mean: float
    protest_risk: float
    acceptance_rate: float
