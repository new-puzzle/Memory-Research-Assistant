"""
Voice interaction API endpoints for STT and TTS.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Dict, Optional
from pydantic import BaseModel

from app.services.speech_to_text_service import speech_to_text_service
from app.services.text_to_speech_service import text_to_speech_service
from app.core.security import get_current_user

router = APIRouter(prefix="/voice", tags=["voice"])


class TextToSpeechRequest(BaseModel):
    """Request model for text-to-speech."""
    text: str
    language_code: str = "en-US"
    voice_name: Optional[str] = None
    speaking_rate: float = 1.0
    pitch: float = 0.0


class SpeechToTextResponse(BaseModel):
    """Response model for speech-to-text."""
    transcript: str
    confidence: Optional[float] = None


@router.post("/speech-to-text", response_model=SpeechToTextResponse)
async def speech_to_text(
    audio: UploadFile = File(...),
    language_code: str = "en-US",
    current_user: Dict = Depends(get_current_user)
):
    """
    Convert speech audio to text using Google Cloud STT.

    Accepts audio file upload and returns transcribed text.
    Supported formats: WAV, FLAC, MP3 (LINEAR16 recommended)
    """
    try:
        # Read audio content
        audio_content = await audio.read()

        # Transcribe using Google Cloud STT
        transcript = await speech_to_text_service.transcribe_audio(
            audio_content=audio_content,
            language_code=language_code
        )

        return SpeechToTextResponse(
            transcript=transcript,
            confidence=None  # Confidence not available for non-streaming
        )

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Speech-to-Text service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transcribe audio: {str(e)}"
        )


@router.post("/text-to-speech")
async def text_to_speech(
    request: TextToSpeechRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Convert text to speech audio using Google Cloud TTS.

    Returns audio as MP3 stream that can be played directly.
    """
    try:
        # Synthesize speech using Google Cloud TTS
        audio_content = await text_to_speech_service.synthesize_speech(
            text=request.text,
            language_code=request.language_code,
            voice_name=request.voice_name,
            speaking_rate=request.speaking_rate,
            pitch=request.pitch
        )

        # Return audio as streaming response
        return StreamingResponse(
            iter([audio_content]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3",
                "Cache-Control": "no-cache"
            }
        )

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Text-to-Speech service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synthesize speech: {str(e)}"
        )


@router.get("/list-voices")
async def list_voices(
    language_code: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """
    List available TTS voices.

    Optionally filter by language code.
    """
    try:
        voices = await text_to_speech_service.list_voices(language_code=language_code)

        return {
            "voices": voices,
            "total": len(voices)
        }

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Text-to-Speech service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list voices: {str(e)}"
        )


@router.get("/health")
async def voice_health_check(current_user: Dict = Depends(get_current_user)):
    """
    Check if voice services are available.

    Returns status of STT and TTS services.
    """
    stt_available = speech_to_text_service.client is not None
    tts_available = text_to_speech_service.client is not None

    return {
        "speech_to_text": {
            "available": stt_available,
            "status": "ready" if stt_available else "unavailable"
        },
        "text_to_speech": {
            "available": tts_available,
            "status": "ready" if tts_available else "unavailable"
        },
        "overall_status": "ready" if (stt_available and tts_available) else "degraded"
    }
