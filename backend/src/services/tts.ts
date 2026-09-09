import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { config } from '../config/env.js';

let ttsClient: TextToSpeechClient | null = null;

try {
  if (config.googleCloudCredentialsPath) {
    ttsClient = new TextToSpeechClient({
      keyFilename: config.googleCloudCredentialsPath,
    });
  } else {
    ttsClient = new TextToSpeechClient();
  }
} catch {
  console.warn('⚠️ Google Cloud TTS client initialized without explicit credentials.');
}

// Default natural, warm companion voice
const DEFAULT_VOICE = {
  languageCode: 'en-US',
  name: 'en-US-Neural2-F', // Warm, clear, natural neural voice
};

const DEFAULT_AUDIO_CONFIG = {
  audioEncoding: 'MP3' as const,
  speakingRate: 1.0,
  pitch: 0.0,
};

export class StreamingTTSSession {
  private isInterrupted = false;

  constructor(
    private callbacks: {
      onAudioChunk: (base64Chunk: string) => void;
      onDone: () => void;
      onError: (err: any) => void;
    }
  ) {}

  public interrupt() {
    this.isInterrupted = true;
  }

  /**
   * Synthesizes text in sentence/phrase chunks to stream audio rapidly
   */
  public async synthesizeAndStream(fullText: string): Promise<void> {
    if (this.isInterrupted) return;

    if (!ttsClient) {
      this.callbacks.onError(new Error('Google Cloud TTS client not configured'));
      return;
    }

    try {
      // Split into clean sentence chunks so playback can start immediately
      const sentences = fullText
        .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
        ?.map((s) => s.trim())
        .filter((s) => s.length > 0) || [fullText];

      for (const sentence of sentences) {
        if (this.isInterrupted) {
          console.log('🔇 TTS playback interrupted by user');
          return;
        }

        const request = {
          input: { text: sentence },
          voice: DEFAULT_VOICE,
          audioConfig: DEFAULT_AUDIO_CONFIG,
        };

        const [response] = await ttsClient.synthesizeSpeech(request);

        if (this.isInterrupted) return;

        if (response.audioContent) {
          const audioBuffer = Buffer.isBuffer(response.audioContent)
            ? response.audioContent
            : Buffer.from(response.audioContent as Uint8Array);

          // Chunk the audio buffer into ~16KB pieces for smooth streaming
          const chunkSize = 16384;
          for (let i = 0; i < audioBuffer.length; i += chunkSize) {
            if (this.isInterrupted) return;
            const chunk = audioBuffer.subarray(i, i + chunkSize);
            this.callbacks.onAudioChunk(chunk.toString('base64'));
          }
        }
      }

      if (!this.isInterrupted) {
        this.callbacks.onDone();
      }
    } catch (err: any) {
      if (!this.isInterrupted) {
        this.callbacks.onError(err);
      }
    }
  }
}
