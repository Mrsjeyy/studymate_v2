from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    cors_origins: list[str] = ["*"]
    env: str = "development"

    frontend_url: str = "http://localhost:5173"

    resend_api_key: str = ""
    resend_from: str = "StudyMate <onboarding@resend.dev>"

    gemini_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
