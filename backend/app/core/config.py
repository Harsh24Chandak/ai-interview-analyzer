"""Application configuration loaded from environment variables."""
import os
from pathlib import Path

# Load .env file manually if python-dotenv is not installed
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


class Settings:
    PROJECT_NAME: str = "AI Interview Analyzer API"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"

    SECRET_KEY: str = os.getenv("SECRET_KEY", "ai-interview-analyzer-academic-secret-key-2026-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'ai_interview_analyzer.db'}")
    @property
    def SQLITE_PATH(self) -> str:
        import sqlite3
        candidate = str(self.BASE_DIR / "ai_interview_analyzer.db")
        try:
            conn = sqlite3.connect(candidate)
            conn.execute("CREATE TABLE IF NOT EXISTS _health_probe (id INTEGER)")
            conn.close()
            return candidate
        except Exception:
            return "/tmp/ai_interview_analyzer.db"

    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10")) * 1024 * 1024

    ALLOWED_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,*"
        ).split(",")
        if origin.strip()
    ]

    @property
    def is_live_ai_configured(self) -> bool:
        key = (self.GEMINI_API_KEY or "").strip()
        return bool(key and key != "your_gemini_api_key_here" and len(key) > 10)


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
