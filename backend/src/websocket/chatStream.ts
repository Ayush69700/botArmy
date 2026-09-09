import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { verifyJwtToken } from '../middleware/auth.js';
import { chatService } from '../services/chat.js';
import { AuthUser, ChatWsClientMessage, ChatWsServerMessage } from '../types/index.js';

export function handleChatWebSocket(ws: WebSocket, req: IncomingMessage) {
  let user: AuthUser | null = null;

  // Check token in query param: /api/chat/stream?token=...
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (token) {
      user = verifyJwtToken(token);
    }
  } catch {
    // Handled below
  }

  const send = (msg: ChatWsServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  ws.on('message', async (raw) => {
    try {
      const data: ChatWsClientMessage = JSON.parse(raw.toString());

      if (data.type === 'auth') {
        user = verifyJwtToken(data.token);
        if (!user) {
          send({ type: 'error', error: 'Unauthorized: invalid token' });
          ws.close();
        }
        return;
      }

      if (data.type === 'message') {
        if (!user) {
          send({ type: 'error', error: 'Unauthorized: authenticate first' });
          return;
        }

        if (!data.content || !data.content.trim()) {
          send({ type: 'error', error: 'Message content is required' });
          return;
        }

        try {
          for await (const event of chatService.processMessageStream(user.id, data.content.trim())) {
            send(event);
          }
        } catch (err: any) {
          console.error('Chat stream error:', err);
          send({
            type: 'error',
            error: 'assistant_unavailable',
            retryable: true,
          });
        }
      }
    } catch (err) {
      send({ type: 'error', error: 'Invalid message payload' });
    }
  });

  ws.on('error', (err) => {
    console.error('Chat WebSocket error:', err);
  });
}
