"""
Application configuration using pydantic-settings.
Loads settings from environment variables and .env file.
"""

import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    """HAZOP Assistant Agent backend configuration."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # Google Gemini API Key
    GOOGLE_API_KEY: str = ""

    # Google Cloud
    GOOGLE_CLOUD_PROJECT: str = "hazop-assistant"
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Firestore
    FIRESTORE_DATABASE: str = "(default)"

    # Google Cloud Storage
    GCS_BUCKET: str = "hazop-assistant-uploads"

    # Security
    SECRET_KEY: str = "dev-secret-change-in-production"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()

if not settings.GOOGLE_API_KEY:
    print(
        "WARNING: GOOGLE_API_KEY is empty. Gemini API calls will fail.\n"
        f"  Checked .env at: {_ENV_FILE}\n"
        "  Set GOOGLE_API_KEY in your .env file or environment.",
        file=sys.stderr,
    )
