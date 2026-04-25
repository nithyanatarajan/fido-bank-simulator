from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bank_host: str = "0.0.0.0"
    bank_port: int = 9090
    fido_stepup_enabled: bool = True
    rp_id: str = ""
    rp_name: str = ""
    rp_origin: str = ""
    jwt_secret: str = ""
    jwt_expiry_seconds: int = 300
    cors_origins: str = ""
    session_max_age_seconds: int = 3600

    model_config = {"env_file": "../env.sample", "env_file_encoding": "utf-8"}

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
