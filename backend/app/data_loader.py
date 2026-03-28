from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from .models import PolicyScenario


def load_seed_population(csv_path: Path) -> pd.DataFrame:
    return pd.read_csv(csv_path)


def load_scenarios(json_path: Path) -> list[PolicyScenario]:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    return [PolicyScenario.model_validate(item) for item in data]
