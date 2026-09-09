export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  used_memory_ids?: string[] | null;
  created_at: Date;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  source_message_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthUser {
  id: string;
  email: string;
}

// WebSocket message protocols
export type ChatWsClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'message'; content: string };

export type ChatWsServerMessage =
  | { type: 'chunk'; text: string }
  | {
      type: 'complete';
      userMessage: Message;
      assistantMessage: Message;
      usedMemories: Memory[];
    }
  | { type: 'error'; error: string; retryable?: boolean };

export type VoiceWsClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'audio_chunk'; data: string } // base64 audio
  | { type: 'interrupt' };

export type VoiceWsServerMessage =
  | { type: 'transcript_partial'; text: string }
  | { type: 'transcript_final'; text: string }
  | { type: 'assistant_text'; text: string }
  | { type: 'audio_chunk'; data: string } // base64 synthesized audio
  | { type: 'audio_done' }
  | { type: 'error'; message: string };
