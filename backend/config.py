from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bank_host: str = "0.0.0.0"
    bank_port: int = 8000
    fido_stepup_enabled: bool = True
    rp_id: str = "localhost"
    rp_name: str = "FIDO Bank Simulator"
    rp_origin: str = "http://localhost:8000"
    jwt_secret: str = "change-me-in-production"
    jwt_expiry_seconds: int = 300

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
