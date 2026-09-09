import { SpeechClient } from '@google-cloud/speech';
import { config } from '../config/env.js';

let speechClient: SpeechClient | null = null;

try {
  if (config.googleCloudCredentialsPath) {
    speechClient = new SpeechClient({
      keyFilename: config.googleCloudCredentialsPath,
    });
  } else {
    // If running in GCP environment with default application credentials
    speechClient = new SpeechClient();
  }
} catch {
  console.warn('⚠️ Google Cloud Speech client initialized without explicit credentials.');
}

export interface StreamingSTTCallbacks {
  onPartialTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  onError: (error: any) => void;
}

export class StreamingSTTSession {
  private recognizeStream: any = null;
  private isDestroyed = false;

  constructor(private callbacks: StreamingSTTCallbacks) {
    this.initStream();
  }

  private initStream() {
    if (!speechClient) {
      return;
    }

    try {
      const request = {
        config: {
          encoding: 'LINEAR16' as const,
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          interimResults: true,
        },
        interimResults: true,
      };

      this.recognizeStream = speechClient
        .streamingRecognize(request)
        .on('error', (err: any) => {
          if (!this.isDestroyed) {
            this.callbacks.onError(err);
          }
        })
        .on('data', (data: any) => {
          if (this.isDestroyed || !data.results || data.results.length === 0) return;

          const result = data.results[0];
          const transcript = result.alternatives[0]?.transcript || '';

          if (result.isFinal) {
            this.callbacks.onFinalTranscript(transcript.trim());
          } else {
            this.callbacks.onPartialTranscript(transcript.trim());
          }
        });
    } catch (err) {
      this.callbacks.onError(err);
    }
  }

  public writeAudioChunk(chunk: Buffer) {
    if (this.isDestroyed) return;
    if (this.recognizeStream && this.recognizeStream.writable) {
      this.recognizeStream.write(chunk);
    }
  }

  public end() {
    if (this.recognizeStream && this.recognizeStream.writable) {
      this.recognizeStream.end();
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.recognizeStream) {
      try {
        this.recognizeStream.destroy();
      } catch {
        // Ignored
      }
      this.recognizeStream = null;
    }
  }
}
