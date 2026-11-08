import os
from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    APP_NAME: str = "VisionForge Studio"
    APP_ENV: str = "development"
    DEBUG: bool = True
    VERSION: str = "1.0.0"

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"

    # Persistent Storage Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    UPLOADS_DIR: Path = DATA_DIR / "uploads"
    VIDEOS_DIR: Path = DATA_DIR / "videos"
    FRAMES_DIR: Path = DATA_DIR / "frames"
    DATASETS_DIR: Path = DATA_DIR / "datasets"
    MODELS_DIR: Path = DATA_DIR / "models"
    CHECKPOINTS_DIR: Path = DATA_DIR / "checkpoints"
    EXPORTS_DIR: Path = DATA_DIR / "exports"
    LOGS_DIR: Path = DATA_DIR / "logs"

    # Database
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'visionforge.db'}"

    # External weights and models discovery
    AURELIX_WEIGHTS_DIR: Path = Path(os.getenv("AURELIX_WEIGHTS_DIR", str(BASE_DIR / "weights" / "aurelix")))
    MHYRA_WEIGHTS_DIR: Path = Path(os.getenv("MHYRA_WEIGHTS_DIR", str(BASE_DIR / "weights" / "mhyra")))

    # AI & Google Stitch / Gemini API Keys
    GEMINI_API_KEY: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    GOOGLE_API_KEY: str = Field(default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""))
    STITCH_API_KEY: str = Field(default_factory=lambda: os.getenv("STITCH_API_KEY", ""))
    GOOGLE_PROJECT_ID: str = Field(default_factory=lambda: os.getenv("GOOGLE_PROJECT_ID", "7074070694"))

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    def ensure_directories(self) -> None:
        for path in [
            self.DATA_DIR,
            self.UPLOADS_DIR,
            self.VIDEOS_DIR,
            self.FRAMES_DIR,
            self.DATASETS_DIR,
            self.MODELS_DIR,
            self.CHECKPOINTS_DIR,
            self.EXPORTS_DIR,
            self.LOGS_DIR,
        ]:
            path.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
