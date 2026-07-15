from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    fido_stepup_enabled: bool = True
    rp_id: str = ""
    rp_name: str = ""
    rp_origin: str = ""
    jwt_secret: str = ""
    jwt_expiry_seconds: int = 300
    cors_origins: str = ""
    session_max_age_seconds: int = 3600

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
