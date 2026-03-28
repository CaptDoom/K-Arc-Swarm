from pathlib import Path

from app.data_loader import load_scenarios, load_seed_population
from app.models import StartSimulationRequest
from app.simulation import PopulationFactory, SimulationEngine


def build_engine() -> SimulationEngine:
    base_dir = Path(__file__).resolve().parents[2]
    scenarios = load_scenarios(base_dir / "data" / "scenarios.json")
    seed_population = load_seed_population(base_dir / "data" / "delhi_agents.csv")
    return SimulationEngine(scenarios=scenarios, population_factory=PopulationFactory(seed_population))


def test_population_factory_creates_requested_agent_count() -> None:
    engine = build_engine()
    run = engine.create_run(
        StartSimulationRequest(name="test", scenario_id="fuel_price_hike", agent_count=100, total_ticks=2)
    )
    assert len(run.agents) == 100


def test_scenario_application_changes_agent_sentiment() -> None:
    engine = build_engine()
    run = engine.create_run(
        StartSimulationRequest(name="test", scenario_id="fuel_price_hike", agent_count=100, total_ticks=1)
    )
    before = [agent.state.sentiment for agent in run.agents]
    engine._process_tick(run)
    after = [agent.state.sentiment for agent in run.agents]
    assert sum(after) != sum(before)


def test_metrics_include_cluster_summary_and_forecast() -> None:
    engine = build_engine()
    run = engine.create_run(
        StartSimulationRequest(name="test", scenario_id="education_reform", agent_count=120, total_ticks=1)
    )
    engine._process_tick(run)
    metrics = run.metrics_history[-1]
    assert metrics.cluster_summary
    assert "next_tick_sentiment" in metrics.forecast
