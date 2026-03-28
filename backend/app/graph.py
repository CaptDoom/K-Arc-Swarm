from __future__ import annotations

import networkx as nx

from .models import CitizenAgent, PolicyScenario


class KnowledgeGraph:
    def __init__(self) -> None:
        self.graph = nx.Graph()

    def ingest_agents(self, agents: list[CitizenAgent]) -> None:
        self.graph.add_node("city:delhi", kind="city", name="Delhi")
        for agent in agents:
            self.graph.add_node(
                f"citizen:{agent.agent_id}",
                kind="citizen",
                occupation=agent.persona.occupation,
                income=agent.persona.income_level,
                sentiment=agent.state.sentiment,
            )
            self.graph.add_edge(f"citizen:{agent.agent_id}", "city:delhi", kind="lives_in")
            for neighbor_id, trust in agent.influence_links.items():
                self.graph.add_edge(
                    f"citizen:{agent.agent_id}",
                    f"citizen:{neighbor_id}",
                    kind="influences",
                    trust=trust,
                )

    def add_scenario(self, scenario: PolicyScenario) -> None:
        node_id = f"policy:{scenario.id}"
        self.graph.add_node(node_id, kind="policy", name=scenario.name, domain=scenario.domain)
        self.graph.add_edge(node_id, "city:delhi", kind="applies_to")

    def update_agent_sentiment(self, agents: list[CitizenAgent]) -> None:
        for agent in agents:
            node_id = f"citizen:{agent.agent_id}"
            if node_id in self.graph:
                self.graph.nodes[node_id]["sentiment"] = agent.state.sentiment
                self.graph.nodes[node_id]["trust"] = agent.state.trust_in_government
