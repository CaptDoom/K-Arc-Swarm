from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_base_dir() -> Path:
    current = Path(__file__).resolve()
    repo_candidate = current.parents[2]
    if (repo_candidate / "data").exists():
        return repo_candidate
    return current.parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "K-ARK NationSim API"
    app_version: str = "0.1.0"
    default_tick_hours: int = Field(default=6, alias="SIM_DEFAULT_TICK_HOURS")
    websocket_broadcast_ms: int = Field(default=100, alias="WS_BROADCAST_MS")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    ollama_base_url: str | None = Field(default=None, alias="OLLAMA_BASE_URL")

    base_dir: Path = _resolve_base_dir()
    data_dir: Path = base_dir / "data"


@lru_cache
def get_settings() -> Settings:
    return Settings()
