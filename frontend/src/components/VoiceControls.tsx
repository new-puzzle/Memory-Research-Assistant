/**
 * Voice Controls Component
 *
 * Provides microphone and speaker buttons for voice interaction:
 * - Microphone: Record voice input and transcribe to text (STT)
 * - Speaker: Convert text to speech and play audio (TTS)
 *
 * Features:
 * - Large, tappable buttons for mobile
 * - Visual feedback (Listening..., Speaking...)
 * - Real-time audio recording and playback
 * - Integration with Google Cloud STT/TTS via backend
 */

import { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, Square, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAppStore } from '../services/store';

interface VoiceControlsProps {
  onTranscript?: (text: string) => void;
  textToSpeak?: string;
  autoSpeak?: boolean;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing';
type SpeakingState = 'idle' | 'speaking' | 'loading';

export default function VoiceControls({
  onTranscript,
  textToSpeak,
  autoSpeak = false,
  className = '',
}: VoiceControlsProps) {
  const { user } = useAppStore();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-speak when textToSpeak changes
  useEffect(() => {
    if (autoSpeak && textToSpeak && textToSpeak.length > 0) {
      handleTextToSpeech();
    }
  }, [textToSpeak, autoSpeak]);

  /**
   * Start recording audio from microphone
   */
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingState('recording');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setRecordingState('idle');
    }
  };

  /**
   * Stop recording audio
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState('processing');
    }
  };

  /**
   * Transcribe audio using backend STT service
   */
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language_code', 'en-US');

      const response = await api.post('/voice/speech-to-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const transcript = response.data.transcript;
      if (transcript && onTranscript) {
        onTranscript(transcript);
      }

      setRecordingState('idle');
    } catch (err) {
      console.error('Error transcribing audio:', err);
      setError('Failed to transcribe audio. Please try again.');
      setRecordingState('idle');
    }
  };

  /**
   * Convert text to speech and play audio
   */
  const handleTextToSpeech = async () => {
    if (!textToSpeak || textToSpeak.length === 0) {
      setError('No text to speak');
      return;
    }

    try {
      setError(null);
      setSpeakingState('loading');

      const response = await api.post(
        '/voice/text-to-speech',
        {
          text: textToSpeak,
          language_code: 'en-US',
          speaking_rate: 1.0,
          pitch: 0.0,
        },
        {
          responseType: 'blob',
        }
      );

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setSpeakingState('speaking');
      audio.onended = () => {
        setSpeakingState('idle');
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setError('Failed to play audio');
        setSpeakingState('idle');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      console.error('Error with text-to-speech:', err);
      setError('Failed to generate speech. Please try again.');
      setSpeakingState('idle');
    }
  };

  /**
   * Stop speaking
   */
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSpeakingState('idle');
    }
  };

  /**
   * Handle microphone button click
   */
  const handleMicClick = () => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  };

  /**
   * Handle speaker button click
   */
  const handleSpeakerClick = () => {
    if (speakingState === 'idle') {
      handleTextToSpeech();
    } else if (speakingState === 'speaking') {
      stopSpeaking();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Microphone Button */}
      <div className="relative">
        <button
          onClick={handleMicClick}
          disabled={recordingState === 'processing'}
          className={`
            relative p-4 rounded-full transition-all duration-200
            ${
              recordingState === 'recording'
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : recordingState === 'processing'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }
            text-white shadow-lg hover:shadow-xl
            active:scale-95 disabled:opacity-50
            focus:outline-none focus:ring-4 focus:ring-blue-300
          `}
          aria-label={
            recordingState === 'recording'
              ? 'Stop recording'
              : recordingState === 'processing'
              ? 'Processing...'
              : 'Start recording'
          }
        >
          {recordingState === 'processing' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : recordingState === 'recording' ? (
            <Square className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>

        {/* Recording indicator */}
        {recordingState === 'recording' && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
        )}
      </div>

      {/* Status text */}
      <div className="flex-1 min-w-0">
        {recordingState === 'recording' && (
          <p className="text-sm font-medium text-red-600 animate-pulse">
            Listening...
          </p>
        )}
        {recordingState === 'processing' && (
          <p className="text-sm font-medium text-gray-600">
            Processing...
          </p>
        )}
        {speakingState === 'speaking' && (
          <p className="text-sm font-medium text-blue-600 animate-pulse">
            Speaking...
          </p>
        )}
        {speakingState === 'loading' && (
          <p className="text-sm font-medium text-gray-600">
            Loading audio...
          </p>
        )}
      </div>

      {/* Speaker Button */}
      <div className="relative">
        <button
          onClick={handleSpeakerClick}
          disabled={!textToSpeak || speakingState === 'loading'}
          className={`
            relative p-4 rounded-full transition-all duration-200
            ${
              speakingState === 'speaking'
                ? 'bg-green-500 hover:bg-green-600 animate-pulse'
                : speakingState === 'loading'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }
            text-white shadow-lg hover:shadow-xl
            active:scale-95 disabled:opacity-50
            focus:outline-none focus:ring-4 focus:ring-purple-300
          `}
          aria-label={
            speakingState === 'speaking'
              ? 'Stop speaking'
              : speakingState === 'loading'
              ? 'Loading...'
              : 'Speak text'
          }
        >
          {speakingState === 'loading' ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Volume2 className="w-6 h-6" />
          )}
        </button>

        {/* Speaking indicator */}
        {speakingState === 'speaking' && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-ping" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
