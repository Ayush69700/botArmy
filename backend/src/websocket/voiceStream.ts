import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { verifyJwtToken } from '../middleware/auth.js';
import { chatService } from '../services/chat.js';
import { StreamingSTTSession } from '../services/stt.js';
import { StreamingTTSSession } from '../services/tts.js';
import { AuthUser, VoiceWsClientMessage, VoiceWsServerMessage } from '../types/index.js';

export function handleVoiceWebSocket(ws: WebSocket, req: IncomingMessage) {
  let user: AuthUser | null = null;
  let sttSession: StreamingSTTSession | null = null;
  let currentTTSSession: StreamingTTSSession | null = null;

  // Check token in query param: /api/voice/stream?token=...
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (token) {
      user = verifyJwtToken(token);
    }
  } catch {
    // Handled below
  }

  const send = (msg: VoiceWsServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const cleanupSTT = () => {
    if (sttSession) {
      sttSession.destroy();
      sttSession = null;
    }
  };

  const stopActiveTTS = () => {
    if (currentTTSSession) {
      currentTTSSession.interrupt();
      currentTTSSession = null;
    }
  };

  // Pipeline to run after user finishes speaking
  const processVoiceTurn = async (spokenText: string) => {
    if (!user || !spokenText.trim()) return;

    try {
      // 1. Run through the same chat pipeline as POST /api/chat/message
      const { assistantMessage } = await chatService.processMessage(user.id, spokenText);

      // 2. Send assistant text for frontend display/log
      send({
        type: 'assistant_text',
        text: assistantMessage.content,
      });

      // 3. Synthesize and stream speech audio chunks back
      stopActiveTTS();
      currentTTSSession = new StreamingTTSSession({
        onAudioChunk: (data: string) => {
          send({ type: 'audio_chunk', data });
        },
        onDone: () => {
          send({ type: 'audio_done' });
          currentTTSSession = null;
        },
        onError: (err: any) => {
          console.warn('TTS streaming error:', err.message);
          send({ type: 'error', message: 'TTS playback error' });
          currentTTSSession = null;
        },
      });

      await currentTTSSession.synthesizeAndStream(assistantMessage.content);
    } catch (err: any) {
      console.error('Voice turn processing error:', err);
      send({ type: 'error', message: 'Failed to process voice response' });
    }
  };

  // Initialize STT streaming session
  const initSTTSession = () => {
    cleanupSTT();

    sttSession = new StreamingSTTSession({
      onPartialTranscript: (text: string) => {
        send({ type: 'transcript_partial', text });
      },
      onFinalTranscript: (text: string) => {
        send({ type: 'transcript_final', text });
        cleanupSTT();
        // Trigger chat and TTS response
        processVoiceTurn(text);
      },
      onError: (err: any) => {
        console.warn('STT streaming error:', err.message);
        send({ type: 'error', message: 'STT speech recognition error' });
        cleanupSTT();
      },
    });
  };

  ws.on('message', async (raw: Buffer | string) => {
    try {
      // Check if message is binary audio chunk
      if (Buffer.isBuffer(raw)) {
        if (!user) {
          send({ type: 'error', message: 'Unauthorized: authenticate first' });
          return;
        }

        // When user speaks, interrupt any active TTS playing
        stopActiveTTS();

        if (!sttSession) {
          initSTTSession();
        }
        sttSession?.writeAudioChunk(raw);
        return;
      }

      // JSON message payload
      const text = raw.toString();
      const data: VoiceWsClientMessage = JSON.parse(text);

      if (data.type === 'auth') {
        user = verifyJwtToken(data.token);
        if (!user) {
          send({ type: 'error', message: 'Unauthorized: invalid token' });
          ws.close();
        }
        return;
      }

      if (data.type === 'interrupt') {
        // User tapped anywhere to interrupt -> stop TTS immediately
        console.log('🔇 Voice stream interrupted by client');
        stopActiveTTS();
        cleanupSTT();
        return;
      }

      if (data.type === 'audio_chunk') {
        if (!user) {
          send({ type: 'error', message: 'Unauthorized: authenticate first' });
          return;
        }

        stopActiveTTS();

        if (!sttSession) {
          initSTTSession();
        }

        const audioBuffer = Buffer.from(data.data, 'base64');
        sttSession?.writeAudioChunk(audioBuffer);
      }
    } catch (err: any) {
      send({ type: 'error', message: 'Invalid voice message format' });
    }
  });

  ws.on('close', () => {
    cleanupSTT();
    stopActiveTTS();
  });

  ws.on('error', (err) => {
    console.error('Voice WebSocket error:', err);
    cleanupSTT();
    stopActiveTTS();
  });
}
