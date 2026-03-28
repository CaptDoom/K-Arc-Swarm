from __future__ import annotations

import asyncio
import random
import statistics
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Awaitable, Callable

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from .graph import KnowledgeGraph
from .llm import InsightGenerator
from .models import (
    AgentMode,
    CitizenAgent,
    HeatPoint,
    MemoryRecord,
    Persona,
    PolicyScenario,
    ScenarioComparison,
    SentimentBand,
    SimulationMetrics,
    SimulationSnapshot,
    StartSimulationRequest,
    CustomPolicyInput,
)


def clamp(value: float, minimum: float = -1.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


@dataclass
class SimulationRun:
    simulation_id: str
    name: str
    agents: list[CitizenAgent]
    scenarios: dict[str, PolicyScenario]
    tick_hours: int
    total_ticks: int
    tick_delay_ms: int
    current_tick: int = 0
    scheduled_events: dict[int, list[str]] = field(default_factory=lambda: defaultdict(list))
    status: str = "idle"
    event_log: list[str] = field(default_factory=list)
    metrics_history: list[SimulationMetrics] = field(default_factory=list)


class PopulationFactory:
    def __init__(self, seed_df: pd.DataFrame) -> None:
        self.seed_df = seed_df

    def build_population(self, agent_count: int) -> list[CitizenAgent]:
        rows = self.seed_df.sample(n=agent_count, replace=True, random_state=42).reset_index(drop=True)
        agents: list[CitizenAgent] = []
        for index, row in rows.iterrows():
            persona = Persona(
                age_group=row["age_group"],
                income_level=row["income_level"],
                education=row["education"],
                occupation=row["occupation"],
                lat=float(row["lat"]) + random.uniform(-0.05, 0.05),
                lng=float(row["lng"]) + random.uniform(-0.05, 0.05),
                political_leaning=float(row["political_leaning"]),
                economic_views=float(row["economic_views"]),
                social_views=float(row["social_views"]),
                risk_tolerance=float(row["risk_tolerance"]),
            )
            agent = CitizenAgent(agent_id=index + 1, cluster_weight=1, persona=persona)
            agent.state.sentiment = clamp(random.uniform(-0.15, 0.2))
            agent.state.economic_status = clamp(random.uniform(-0.2, 0.25))
            agent.state.trust_in_government = clamp(random.uniform(0.2, 0.8), 0.0, 1.0)
            agents.append(agent)

        self._wire_social_network(agents)
        return agents

    def _wire_social_network(self, agents: list[CitizenAgent]) -> None:
        for agent in agents:
            neighbors = random.sample(agents, k=min(6, len(agents)))
            for neighbor in neighbors:
                if neighbor.agent_id != agent.agent_id:
                    agent.influence_links[neighbor.agent_id] = round(random.uniform(0.2, 0.9), 2)


class SimulationEngine:
    def __init__(self, scenarios: list[PolicyScenario], population_factory: PopulationFactory) -> None:
        self.scenario_index = {scenario.id: scenario for scenario in scenarios}
        self.population_factory = population_factory
        self.insight_generator = InsightGenerator()
        self.graph = KnowledgeGraph()
        self.runs: dict[str, SimulationRun] = {}

    def create_run(self, request: StartSimulationRequest) -> SimulationRun:
        simulation_id = str(uuid.uuid4())
        agents = self.population_factory.build_population(request.agent_count)
        scenario_id = request.scenario_id
        if request.custom_policy is not None:
            scenario_id = self.create_custom_scenario(request.custom_policy).id
        if not scenario_id:
            raise ValueError("A scenario_id or custom_policy is required to start a simulation.")
        run = SimulationRun(
            simulation_id=simulation_id,
            name=request.name,
            agents=agents,
            scenarios=self.scenario_index,
            tick_hours=request.tick_hours,
            total_ticks=request.total_ticks,
            tick_delay_ms=request.tick_delay_ms,
        )
        run.scheduled_events[0].append(scenario_id)
        self.graph.ingest_agents(agents)
        self.runs[simulation_id] = run
        return run

    def inject_policy(self, simulation_id: str, scenario_id: str, tick: int) -> None:
        run = self.runs[simulation_id]
        effective_tick = max(tick, run.current_tick + 1)
        run.scheduled_events[effective_tick].append(scenario_id)
        run.event_log.append(f"Scheduled {scenario_id} for tick {effective_tick}.")

    def create_custom_scenario(self, custom_policy: CustomPolicyInput) -> PolicyScenario:
        scenario = PolicyScenario(
            id=f"custom_{uuid.uuid4().hex[:8]}",
            name=custom_policy.name,
            description=custom_policy.description,
            domain=custom_policy.domain,
            parameters={
                "target_groups": custom_policy.target_groups,
                "sentiment_shock": custom_policy.sentiment_shock,
                "trust_shift": custom_policy.trust_shift,
                "economic_stress": custom_policy.economic_stress,
            },
        )
        self.scenario_index[scenario.id] = scenario
        return scenario

    async def run_ticks(
        self,
        simulation_id: str,
        on_tick: Callable[[SimulationSnapshot], Awaitable[None]] | None = None,
        tick_delay_seconds: float = 0.1,
    ) -> None:
        run = self.runs[simulation_id]
        run.status = "running"
        for tick in range(run.current_tick, run.total_ticks):
            run.current_tick = tick
            self._process_tick(run)
            if on_tick is not None:
                await on_tick(self.snapshot(simulation_id))
            await asyncio.sleep(tick_delay_seconds)
        run.status = "completed"
        if on_tick is not None:
            await on_tick(self.snapshot(simulation_id))

    def _process_tick(self, run: SimulationRun) -> None:
        for scenario_id in run.scheduled_events.get(run.current_tick, []):
            scenario = run.scenarios[scenario_id]
            self.graph.add_scenario(scenario)
            run.event_log.append(f"Tick {run.current_tick}: applied {scenario.name}.")
            self._apply_scenario(run.agents, scenario, run.current_tick)

        self._social_interactions(run.agents, run.current_tick)
        self.graph.update_agent_sentiment(run.agents)
        run.metrics_history.append(self._collect_metrics(run))

    def _apply_scenario(self, agents: list[CitizenAgent], scenario: PolicyScenario, tick: int) -> None:
        for agent in agents:
            impact = scenario.parameters.sentiment_shock
            if scenario.parameters.target_groups and agent.persona.occupation in scenario.parameters.target_groups:
                impact *= 1.35
            if agent.persona.income_level == "low":
                impact *= 1.1

            agent.state.mode = AgentMode.PROCESSING
            agent.state.sentiment = clamp(agent.state.sentiment + impact)
            agent.state.trust_in_government = clamp(
                agent.state.trust_in_government + scenario.parameters.trust_shift,
                0.0,
                1.0,
            )
            agent.state.economic_status = clamp(agent.state.economic_status - scenario.parameters.economic_stress)

            if agent.state.sentiment < -0.6 and agent.state.trust_in_government < 0.3:
                agent.state.mode = AgentMode.PROTESTING
            elif impact > 0:
                agent.state.mode = AgentMode.RECOVERING

            agent.remember(
                MemoryRecord(
                    tick=tick,
                    event_type=scenario.id,
                    impact=impact,
                    note=self.insight_generator.explain_reaction(agent, scenario, impact),
                )
            )

    def _social_interactions(self, agents: list[CitizenAgent], tick: int) -> None:
        sample_size = min(len(agents), max(50, len(agents) // 10))
        sampled = random.sample(agents, k=sample_size)
        agent_index = {agent.agent_id: agent for agent in agents}
        for agent in sampled:
            if not agent.influence_links:
                continue
            partner = agent_index.get(random.choice(list(agent.influence_links.keys())))
            if partner is None:
                continue

            agent.state.mode = AgentMode.INTERACTING
            similarity = agent.similarity(partner)
            trust_factor = agent.influence_links[partner.agent_id]
            influence = (partner.state.sentiment - agent.state.sentiment) * 0.08 * similarity * trust_factor
            trust_shift = (partner.state.trust_in_government - agent.state.trust_in_government) * 0.03 * similarity
            agent.state.sentiment = clamp(agent.state.sentiment + influence)
            agent.state.trust_in_government = clamp(agent.state.trust_in_government + trust_shift, 0.0, 1.0)
            if agent.state.mode != AgentMode.PROTESTING:
                agent.state.mode = AgentMode.IDLE
            agent.remember(
                MemoryRecord(
                    tick=tick,
                    event_type="social_interaction",
                    impact=influence,
                    note=f"Influenced by neighbor {partner.agent_id} with trust {trust_factor:.2f}.",
                )
            )

    def _collect_metrics(self, run: SimulationRun) -> SimulationMetrics:
        sentiments = [agent.state.sentiment for agent in run.agents]
        trusts = [agent.state.trust_in_government for agent in run.agents]
        economics = [agent.state.economic_status for agent in run.agents]
        negative_count = sum(1 for value in sentiments if value < -0.2)
        positive_count = sum(1 for value in sentiments if value > 0.2)
        neutral_count = len(sentiments) - negative_count - positive_count
        acceptance_rate = sum(1 for value in sentiments if value >= 0) / len(sentiments)
        cohesion = 1.0 - min(1.0, statistics.pstdev(sentiments) if len(sentiments) > 1 else 0.0)

        return SimulationMetrics(
            tick=run.current_tick,
            sentiment_mean=float(np.mean(sentiments)),
            trust_mean=float(np.mean(trusts)),
            economic_mean=float(np.mean(economics)),
            protest_risk=self._estimate_protest_risk(run.agents),
            cohesion=cohesion,
            acceptance_rate=acceptance_rate,
            sentiment_band=SentimentBand(
                positive=positive_count / len(sentiments),
                neutral=neutral_count / len(sentiments),
                negative=negative_count / len(sentiments),
            ),
            heatmap=self._build_heatmap(run.agents),
            event_log=run.event_log[-8:],
            forecast=self._forecast(sentiments, trusts, run.metrics_history),
            cluster_summary=self._cluster_opinions(run.agents),
        )

    def _estimate_protest_risk(self, agents: list[CitizenAgent]) -> float:
        vulnerable = [
            agent for agent in agents if agent.state.sentiment < -0.6 and agent.state.trust_in_government < 0.3
        ]
        density_bonus = min(0.25, len(vulnerable) / max(1, len(agents)))
        return round(min(1.0, (len(vulnerable) / max(1, len(agents))) * 2.2 + density_bonus), 3)

    def _build_heatmap(self, agents: list[CitizenAgent]) -> list[HeatPoint]:
        return [
            HeatPoint(
                lat=agent.persona.lat,
                lng=agent.persona.lng,
                sentiment=agent.state.sentiment,
                trust=agent.state.trust_in_government,
                weight=agent.cluster_weight,
            )
            for agent in agents[:250]
        ]

    def _forecast(self, sentiments: list[float], trusts: list[float], history: list[SimulationMetrics]) -> dict:
        if len(history) < 2:
            projected = float(np.mean(sentiments))
        else:
            ticks = np.array([item.tick for item in history], dtype=float)
            values = np.array([item.sentiment_mean for item in history], dtype=float)
            degree = 2 if len(history) >= 3 else 1
            coeffs = np.polyfit(ticks, values, degree)
            projected = float(np.polyval(coeffs, history[-1].tick + 1))

        trust_signal = float(np.mean(trusts))
        confidence = max(0.35, min(0.95, 0.6 + trust_signal * 0.25 - abs(projected) * 0.1))
        return {
            "next_tick_sentiment": round(projected, 3),
            "confidence": round(confidence, 3),
            "insight": (
                "Trust remains the stabilizing factor."
                if trust_signal >= 0.45
                else "Low trust is amplifying negative reactions."
            ),
        }

    def _cluster_opinions(self, agents: list[CitizenAgent]) -> list[dict]:
        if len(agents) < 6:
            return []

        matrix = np.array(
            [
                [
                    agent.state.sentiment,
                    agent.state.trust_in_government,
                    agent.persona.political_leaning,
                    agent.persona.economic_views,
                    agent.persona.social_views,
                ]
                for agent in agents
            ]
        )
        normalized = StandardScaler().fit_transform(matrix)
        labels = KMeans(n_clusters=3, n_init=10, random_state=42).fit_predict(normalized)

        clusters: list[dict] = []
        for cluster_id in range(3):
            members = [agents[index] for index, label in enumerate(labels) if label == cluster_id]
            if not members:
                continue
            clusters.append(
                {
                    "cluster": cluster_id,
                    "size": len(members),
                    "mean_sentiment": round(float(np.mean([item.state.sentiment for item in members])), 3),
                    "mean_trust": round(float(np.mean([item.state.trust_in_government for item in members])), 3),
                    "dominant_occupation": statistics.mode([item.persona.occupation for item in members]),
                }
            )
        return clusters

    def snapshot(self, simulation_id: str) -> SimulationSnapshot:
        run = self.runs[simulation_id]
        metrics = run.metrics_history[-1] if run.metrics_history else self._collect_metrics(run)
        return SimulationSnapshot(
            simulation_id=run.simulation_id,
            status=run.status,
            name=run.name,
            current_tick=run.current_tick,
            total_ticks=run.total_ticks,
            tick_hours=run.tick_hours,
            tick_delay_ms=run.tick_delay_ms,
            metrics=metrics,
        )

    def compare_scenarios(self) -> list[ScenarioComparison]:
        comparisons: list[ScenarioComparison] = []
        for scenario_id, scenario in self.scenario_index.items():
            comparisons.append(
                ScenarioComparison(
                    scenario_id=scenario_id,
                    sentiment_mean=round(scenario.parameters.sentiment_shock * 0.9, 3),
                    protest_risk=round(max(0.0, -scenario.parameters.sentiment_shock * 1.8), 3),
                    acceptance_rate=round(min(1.0, 0.55 + scenario.parameters.sentiment_shock * 1.2), 3),
                )
            )
        return comparisons
