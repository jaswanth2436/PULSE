"""Configuration settings for PULSE backend."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_name: str = "PULSE Traffic Optimization API"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, alias="DEBUG")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # Database
    database_url: str = Field(
        default="sqlite+aiosqlite:///./pulse.db", alias="DATABASE_URL"
    )

    # File storage
    video_upload_dir: str = Field(default="./uploads", alias="VIDEO_UPLOAD_DIR")
    # Renamed from model_path to avoid Pydantic protected namespace warning
    yolo_weights_path: str = Field(default="./models/yolov8n.pt", alias="MODEL_PATH")
    use_mock_detector: bool = Field(default=False, alias="USE_MOCK_DETECTOR")

    # Security
    secret_key: str = Field(default="pulse-dev-secret-key-2024", alias="SECRET_KEY")

    # CORS
    cors_origins_raw: str = Field(
        default="http://localhost:5173,http://localhost:3000", alias="CORS_ORIGINS"
    )

    # Upload limits
    max_upload_size_mb: int = Field(default=500, alias="MAX_UPLOAD_SIZE_MB")

    # WebSocket
    websocket_broadcast_interval: float = Field(
        default=1.0, alias="WEBSOCKET_BROADCAST_INTERVAL"
    )

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins(self) -> list[str]:
        raw = self.cors_origins_raw
        if isinstance(raw, list):
            return raw
        return [o.strip() for o in raw.split(",")]

    @property
    def upload_dir(self) -> str:
        p = Path(self.video_upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return str(p)

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


settings = Settings()
