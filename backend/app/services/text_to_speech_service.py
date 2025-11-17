"""
Google Cloud Text-to-Speech service for voice output.
"""
import os
from typing import Optional
from google.cloud import texttospeech
from google.oauth2 import service_account

from app.core.config import settings


class TextToSpeechService:
    """Service for Google Cloud Text-to-Speech."""

    def __init__(self):
        """Initialize Text-to-Speech client."""
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize Google Cloud TTS client with credentials."""
        try:
            # Use service account if available
            if os.path.exists(settings.google_service_account_json):
                credentials = service_account.Credentials.from_service_account_file(
                    settings.google_service_account_json
                )
                self.client = texttospeech.TextToSpeechClient(credentials=credentials)
            else:
                # Use default credentials
                self.client = texttospeech.TextToSpeechClient()
        except Exception as e:
            print(f"Warning: Could not initialize Text-to-Speech client: {e}")
            self.client = None

    async def synthesize_speech(
        self,
        text: str,
        language_code: str = "en-US",
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0,
        pitch: float = 0.0
    ) -> bytes:
        """
        Convert text to speech audio.

        Args:
            text: Text to convert to speech
            language_code: Language code (default: en-US)
            voice_name: Specific voice name (default: auto-select)
            speaking_rate: Speed of speech (0.25 to 4.0, default: 1.0)
            pitch: Voice pitch (-20.0 to 20.0, default: 0.0)

        Returns:
            Audio content as bytes (MP3 format)

        Raises:
            RuntimeError: If client is not initialized
        """
        if not self.client:
            raise RuntimeError("Text-to-Speech client not initialized. Check credentials.")

        # Set the text input
        synthesis_input = texttospeech.SynthesisInput(text=text)

        # Build the voice request
        if not voice_name:
            # Auto-select best voice for language
            voice_name = self._get_default_voice(language_code)

        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )

        # Select the audio format
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=speaking_rate,
            pitch=pitch,
            effects_profile_id=["headphone-class-device"]  # Optimize for headphones
        )

        # Perform the text-to-speech request
        response = self.client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        return response.audio_content

    async def synthesize_ssml(
        self,
        ssml: str,
        language_code: str = "en-US",
        voice_name: Optional[str] = None
    ) -> bytes:
        """
        Convert SSML (Speech Synthesis Markup Language) to speech.

        Args:
            ssml: SSML formatted text
            language_code: Language code (default: en-US)
            voice_name: Specific voice name (default: auto-select)

        Returns:
            Audio content as bytes (MP3 format)

        Raises:
            RuntimeError: If client is not initialized
        """
        if not self.client:
            raise RuntimeError("Text-to-Speech client not initialized. Check credentials.")

        synthesis_input = texttospeech.SynthesisInput(ssml=ssml)

        if not voice_name:
            voice_name = self._get_default_voice(language_code)

        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            effects_profile_id=["headphone-class-device"]
        )

        response = self.client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        return response.audio_content

    def _get_default_voice(self, language_code: str) -> str:
        """
        Get default voice name for a language code.

        Args:
            language_code: Language code (e.g., en-US, es-ES)

        Returns:
            Voice name
        """
        # Map of language codes to recommended neural voices
        voice_map = {
            "en-US": "en-US-Neural2-J",  # Male neural voice
            "en-GB": "en-GB-Neural2-B",
            "es-ES": "es-ES-Neural2-B",
            "fr-FR": "fr-FR-Neural2-B",
            "de-DE": "de-DE-Neural2-B",
            "ja-JP": "ja-JP-Neural2-B",
            "ko-KR": "ko-KR-Neural2-B",
            "zh-CN": "zh-CN-Neural2-B",
        }

        return voice_map.get(language_code, f"{language_code}-Standard-A")

    async def list_voices(self, language_code: Optional[str] = None) -> list:
        """
        List available voices.

        Args:
            language_code: Filter by language code (optional)

        Returns:
            List of available voices

        Raises:
            RuntimeError: If client is not initialized
        """
        if not self.client:
            raise RuntimeError("Text-to-Speech client not initialized. Check credentials.")

        response = self.client.list_voices(language_code=language_code)

        voices = []
        for voice in response.voices:
            voices.append({
                "name": voice.name,
                "language_codes": voice.language_codes,
                "gender": texttospeech.SsmlVoiceGender(voice.ssml_gender).name,
                "natural_sample_rate": voice.natural_sample_rate_hertz
            })

        return voices


# Global service instance
text_to_speech_service = TextToSpeechService()
