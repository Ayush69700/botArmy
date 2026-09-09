export type Screen = 'landing' | 'chat' | 'voice' | 'memory';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  memoryRecall?: string;
}

export interface Memory {
  id: string;
  text: string;
  updatedAt: string;
}
