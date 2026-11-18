import os
import shutil

is_vercel = os.getenv("VERCEL") == "1"

if is_vercel:
    # On Vercel serverless environment, the root is read-only; copy pre-seeded SQLite DB to /tmp
    default_db_file = "/tmp/infrastructure_pm.db"
    src_db_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "infrastructure_pm.db")
    if os.path.exists(src_db_file) and not os.path.exists(default_db_file):
        try:
            shutil.copyfile(src_db_file, default_db_file)
        except Exception:
            pass
    default_db_url = f"sqlite:///{default_db_file}"
else:
    default_db_url = "sqlite:///./infrastructure_pm.db"

class Settings:
    PROJECT_NAME: str = "IP-WATCH: Infrastructure Project Monitoring & Early Warning"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "gov_infra_secure_jwt_secret_key_2026_antigravity_safe_key_98234")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Defaults to SQLite with full foreign key support, or PostgreSQL if configured via DATABASE_URL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        default_db_url
    )
    
    # Default Risk Weights (configurable in settings)
    WEIGHT_COST: float = 0.30
    WEIGHT_SCHEDULE: float = 0.25
    WEIGHT_PROGRESS: float = 0.20
    WEIGHT_MILESTONE: float = 0.15
    WEIGHT_EXPENDITURE: float = 0.10

settings = Settings()
