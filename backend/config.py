import os

class Settings:
    PROJECT_NAME: str = "IP-WATCH: Infrastructure Project Monitoring & Early Warning"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "gov_infra_secure_jwt_secret_key_2026_antigravity_safe_key_98234")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Defaults to SQLite with full foreign key support, or PostgreSQL if configured
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./infrastructure_pm.db"
    )
    
    # Default Risk Weights (configurable in settings)
    WEIGHT_COST: float = 0.30
    WEIGHT_SCHEDULE: float = 0.25
    WEIGHT_PROGRESS: float = 0.20
    WEIGHT_MILESTONE: float = 0.15
    WEIGHT_EXPENDITURE: float = 0.10

settings = Settings()
