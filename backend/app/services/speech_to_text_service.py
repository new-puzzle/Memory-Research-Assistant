"""
Google Cloud Speech-to-Text service for voice input.
"""
import os
from typing import AsyncIterator
from google.cloud import speech_v1p1beta1 as speech
from google.oauth2 import service_account

from app.core.config import settings


class SpeechToTextService:
    """Service for Google Cloud Speech-to-Text."""

    def __init__(self):
        """Initialize Speech-to-Text client."""
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize Google Cloud Speech client with credentials."""
        try:
            # Use service account if available
            if os.path.exists(settings.google_service_account_json):
                credentials = service_account.Credentials.from_service_account_file(
                    settings.google_service_account_json
                )
                self.client = speech.SpeechClient(credentials=credentials)
            else:
                # Use default credentials
                self.client = speech.SpeechClient()
        except Exception as e:
            print(f"Warning: Could not initialize Speech-to-Text client: {e}")
            self.client = None

    async def transcribe_audio(self, audio_content: bytes, language_code: str = "en-US") -> str:
        """
        Transcribe audio content to text.

        Args:
            audio_content: Audio bytes in supported format (LINEAR16, FLAC, etc.)
            language_code: Language code (default: en-US)

        Returns:
            Transcribed text

        Raises:
            RuntimeError: If client is not initialized
        """
        if not self.client:
            raise RuntimeError("Speech-to-Text client not initialized. Check credentials.")

        audio = speech.RecognitionAudio(content=audio_content)

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=language_code,
            enable_automatic_punctuation=True,
            model="latest_long",
            use_enhanced=True,
        )

        response = self.client.recognize(config=config, audio=audio)

        # Combine all transcripts
        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript + " "

        return transcript.strip()

    async def streaming_transcribe(
        self,
        audio_generator: AsyncIterator[bytes],
        language_code: str = "en-US"
    ) -> AsyncIterator[str]:
        """
        Transcribe streaming audio in real-time.

        Args:
            audio_generator: Async generator yielding audio chunks
            language_code: Language code (default: en-US)

        Yields:
            Interim and final transcription results

        Raises:
            RuntimeError: If client is not initialized
        """
        if not self.client:
            raise RuntimeError("Speech-to-Text client not initialized. Check credentials.")

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=language_code,
            enable_automatic_punctuation=True,
            model="latest_short",
            use_enhanced=True,
        )

        streaming_config = speech.StreamingRecognitionConfig(
            config=config,
            interim_results=True,
            single_utterance=False,
        )

        # Convert async generator to sync generator for gRPC
        async def request_generator():
            yield speech.StreamingRecognizeRequest(streaming_config=streaming_config)
            async for chunk in audio_generator:
                yield speech.StreamingRecognizeRequest(audio_content=chunk)

        responses = self.client.streaming_recognize(
            config=streaming_config,
            requests=request_generator()
        )

        for response in responses:
            for result in response.results:
                transcript = result.alternatives[0].transcript
                is_final = result.is_final

                yield {
                    "transcript": transcript,
                    "is_final": is_final,
                    "confidence": result.alternatives[0].confidence if is_final else None
                }


# Global service instance
speech_to_text_service = SpeechToTextService()
