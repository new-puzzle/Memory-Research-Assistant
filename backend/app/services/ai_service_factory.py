"""
AI Service Factory for creating AI providers.
"""
from app.core.config import settings
from app.services.ai_provider_base import BaseAIProvider
from app.services.ai_providers import (
    ClaudeProvider,
    TogetherProvider,
    DeepSeekProvider,
    MistralProvider,
)


class AIServiceFactory:
    """Factory for creating AI provider instances."""

    @staticmethod
    def create_provider(model_type: str = None) -> BaseAIProvider:
        """
        Create an AI provider based on the model type.

        Args:
            model_type: The type of model to use ('claude', 'together', 'deepseek', 'mistral')
                       If None, uses the default from settings.

        Returns:
            BaseAIProvider instance

        Raises:
            ValueError: If model type is unknown or API key is missing
        """
        if not model_type:
            model_type = settings.default_ai_model

        model_type = model_type.lower()

        if model_type == "claude":
            if not settings.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY is required for Claude model")
            return ClaudeProvider(
                api_key=settings.anthropic_api_key,
                model_name=settings.claude_model,
                max_tokens=settings.max_tokens,
                temperature=settings.temperature
            )

        elif model_type == "together":
            if not settings.together_api_key:
                raise ValueError("TOGETHER_API_KEY is required for Together model")
            return TogetherProvider(
                api_key=settings.together_api_key,
                model_name=settings.together_model,
                max_tokens=settings.max_tokens,
                temperature=settings.temperature
            )

        elif model_type == "deepseek":
            if not settings.deepseek_api_key:
                raise ValueError("DEEPSEEK_API_KEY is required for DeepSeek model")
            return DeepSeekProvider(
                api_key=settings.deepseek_api_key,
                model_name=settings.deepseek_model,
                max_tokens=settings.max_tokens,
                temperature=settings.temperature
            )

        elif model_type == "mistral":
            if not settings.mistral_api_key:
                raise ValueError("MISTRAL_API_KEY is required for Mistral model")
            return MistralProvider(
                api_key=settings.mistral_api_key,
                model_name=settings.mistral_model,
                max_tokens=settings.max_tokens,
                temperature=settings.temperature
            )

        else:
            raise ValueError(
                f"Unknown model type: {model_type}. "
                f"Supported types: claude, together, deepseek, mistral"
            )

    @staticmethod
    def get_available_models() -> list[dict]:
        """
        Get list of available models based on configured API keys.

        Returns:
            List of model dictionaries with 'id', 'name', and 'available' keys
        """
        models = [
            {
                "id": "claude",
                "name": "Claude 3.5 Sonnet",
                "provider": "Anthropic",
                "available": bool(settings.anthropic_api_key),
                "description": "Most capable model for complex reasoning"
            },
            {
                "id": "together",
                "name": "Llama 3.1 70B",
                "provider": "Together AI",
                "available": bool(settings.together_api_key),
                "description": "Fast and cost-effective open source model"
            },
            {
                "id": "deepseek",
                "name": "DeepSeek Chat",
                "provider": "DeepSeek",
                "available": bool(settings.deepseek_api_key),
                "description": "Strong reasoning at low cost"
            },
            {
                "id": "mistral",
                "name": "Mistral Large",
                "provider": "Mistral AI",
                "available": bool(settings.mistral_api_key),
                "description": "European alternative with multilingual support"
            },
        ]
        return models


# Convenience function for creating providers
def get_ai_provider(model_type: str = None) -> BaseAIProvider:
    """
    Convenience function to get an AI provider.

    Args:
        model_type: The type of model to use

    Returns:
        BaseAIProvider instance
    """
    return AIServiceFactory.create_provider(model_type)
