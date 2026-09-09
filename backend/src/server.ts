import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import { config } from './config/env.js';
import { initDb } from './config/db.js';
import { handleChatWebSocket } from './websocket/chatStream.js';
import { handleVoiceWebSocket } from './websocket/voiceStream.js';

async function startServer() {
  // 1. Initialize database connection and schema
  await initDb();

  // 2. Create HTTP server
  const server = http.createServer(app);

  // 3. Create WebSocket server with noServer: true for path routing
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

    if (pathname === '/api/chat/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleChatWebSocket(ws, request);
      });
    } else if (pathname === '/api/voice/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleVoiceWebSocket(ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // 4. Start listening
  server.listen(config.port, () => {
    console.log(`🚀 Companion backend server running on http://localhost:${config.port}`);
    console.log(`📡 WebSocket chat stream: ws://localhost:${config.port}/api/chat/stream`);
    console.log(`🎙️ WebSocket voice stream: ws://localhost:${config.port}/api/voice/stream`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
