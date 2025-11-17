"""
Core configuration for the Memory Palace application.
"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # AI Model API Keys
    anthropic_api_key: str = Field(default="", env="ANTHROPIC_API_KEY")
    together_api_key: str = Field(default="", env="TOGETHER_API_KEY")
    deepseek_api_key: str = Field(default="", env="DEEPSEEK_API_KEY")
    mistral_api_key: str = Field(default="", env="MISTRAL_API_KEY")

    # Google Cloud
    google_client_id: str = Field(..., env="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(..., env="GOOGLE_CLIENT_SECRET")
    google_service_account_json: str = Field(
        default="./service-account.json",
        env="GOOGLE_SERVICE_ACCOUNT_JSON"
    )
    google_cloud_project_id: str = Field(default="", env="GOOGLE_CLOUD_PROJECT_ID")

    # Application
    secret_key: str = Field(..., env="SECRET_KEY")
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True, env="DEBUG")

    # CORS
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        env="CORS_ORIGINS"
    )

    # Security
    basic_auth_username: str = Field(default="admin", env="BASIC_AUTH_USERNAME")
    basic_auth_password: str = Field(default="", env="BASIC_AUTH_PASSWORD")
    allowed_email_domains: str = Field(default="", env="ALLOWED_EMAIL_DOMAINS")

    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")

    # API Settings
    api_v1_prefix: str = "/api/v1"
    project_name: str = "Memory Palace + Research Assistant"
    version: str = "1.0.0"

    # AI Model Settings
    default_ai_model: str = Field(default="claude", env="DEFAULT_AI_MODEL")
    claude_model: str = "claude-3-5-sonnet-20241022"  # Use latest Sonnet
    together_model: str = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
    deepseek_model: str = "deepseek-chat"
    mistral_model: str = "mistral-large-latest"
    max_tokens: int = 4096
    temperature: float = 0.7

    # File Upload Settings
    max_upload_size_mb: int = 10
    allowed_file_types: List[str] = [
        "application/pdf",
        "text/plain",
        "text/markdown",
        "application/json"
    ]

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def allowed_email_domains_list(self) -> List[str]:
        """Parse allowed email domains from comma-separated string."""
        if not self.allowed_email_domains:
            return []
        return [domain.strip() for domain in self.allowed_email_domains.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
