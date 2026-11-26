"""Application configuration, loaded from backend/.env."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # MySQL
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "research_bridge"
    db_user: str = "rb_app"
    db_password: str = ""

    # OpenAlex
    openalex_base_url: str = "https://api.openalex.org"
    openalex_mailto: str = ""

    # API server
    api_host: str = "127.0.0.1"
    api_port: int = 8000


settings = Settings()
