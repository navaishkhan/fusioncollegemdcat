from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/fusion_mdcat"
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    refresh_token_expire_days: int = 30
    cors_origins: str = "http://localhost:3000"
    negative_marking_default: float = -0.25
    rate_limit_per_minute: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def model_post_init(self, __context) -> None:
        if not self.jwt_secret or self.jwt_secret in ("change-me-in-production", "dev-secret-change-on-vercel"):
            import warnings
            warnings.warn(
                "WARNING: JWT_SECRET is not set or using a default value. "
                "Generate a strong random secret for production:\n"
                "  python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )


settings = Settings()
