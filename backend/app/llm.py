from __future__ import annotations

import hashlib
from dataclasses import dataclass

from .models import CitizenAgent, PolicyScenario


@dataclass
class LLMCache:
    store: dict[str, str]

    def get(self, key: str) -> str | None:
        return self.store.get(key)

    def set(self, key: str, value: str) -> None:
        self.store[key] = value


class InsightGenerator:
    def __init__(self) -> None:
        self.cache = LLMCache(store={})

    def _cache_key(self, agent: CitizenAgent, scenario: PolicyScenario) -> str:
        raw = (
            f"{scenario.id}:{agent.persona.occupation}:{agent.persona.income_level}:"
            f"{round(agent.state.sentiment, 2)}:{round(agent.state.trust_in_government, 2)}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def explain_reaction(self, agent: CitizenAgent, scenario: PolicyScenario, impact: float) -> str:
        key = self._cache_key(agent, scenario)
        cached = self.cache.get(key)
        if cached:
            return cached

        if impact < -0.15:
            note = (
                f"{agent.persona.occupation} cluster sees {scenario.name.lower()} as directly harmful "
                "to household stability and becomes more skeptical."
            )
        elif impact > 0.15:
            note = (
                f"{agent.persona.occupation} cluster interprets {scenario.name.lower()} as supportive "
                "of long-term security and responds positively."
            )
        else:
            note = (
                f"{agent.persona.occupation} cluster has a mixed response to {scenario.name.lower()} "
                "and waits for social confirmation."
            )

        self.cache.set(key, note)
        return note
