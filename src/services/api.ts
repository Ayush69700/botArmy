import { Message, Memory } from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('companion_auth_token');
  }

  // Ensure user is authenticated (auto-sign in if no session exists)
  public async ensureAuthenticated(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    let storedEmail = localStorage.getItem('companion_user_email');
    if (!storedEmail) {
      storedEmail = `user_${Math.random().toString(36).substring(2, 9)}@companion.local`;
      localStorage.setItem('companion_user_email', storedEmail);
    }

    try {
      // Attempt login
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail, password: 'companion_local_password' }),
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        this.token = data.token;
        localStorage.setItem('companion_auth_token', data.token);
        return data.token;
      }

      // If login fails, signup
      const signupRes = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail, password: 'companion_local_password' }),
      });

      if (signupRes.ok) {
        const data = await signupRes.json();
        this.token = data.token;
        localStorage.setItem('companion_auth_token', data.token);
        return data.token;
      }
    } catch (err) {
      console.warn('Backend connection warning; running in offline/hybrid mode:', err);
    }

    return '';
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    await this.ensureAuthenticated();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return fetch(url, { ...options, headers });
  }

  // Send a chat message
  public async sendMessage(content: string): Promise<{
    userMessage: Message;
    assistantMessage: Message;
    usedMemories: Memory[];
  }> {
    const res = await this.fetchWithAuth(`${API_BASE}/chat/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      throw new Error(`Chat API error: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      userMessage: {
        id: data.userMessage.id,
        sender: 'user',
        text: data.userMessage.content,
      },
      assistantMessage: {
        id: data.assistantMessage.id,
        sender: 'ai',
        text: data.assistantMessage.content,
        memoryRecall:
          data.usedMemories && data.usedMemories.length > 0
            ? `remembered: ${data.usedMemories[0].content.split(';')[0].slice(0, 34)}`
            : undefined,
      },
      usedMemories: data.usedMemories || [],
    };
  }

  // Retrieve chat history
  public async getChatHistory(): Promise<Message[]> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/chat/history?limit=50`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          // Backend returns newest first; reverse for chronological chat display
          return data.messages.reverse().map((m: any) => ({
            id: m.id,
            sender: m.role === 'user' ? 'user' : 'ai',
            text: m.content,
            memoryRecall:
              m.used_memory_ids && m.used_memory_ids.length > 0
                ? 'remembered from context'
                : undefined,
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load chat history from backend:', err);
    }
    return [];
  }

  // List memories
  public async getMemories(search?: string): Promise<Memory[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await this.fetchWithAuth(`${API_BASE}/memories${query}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.memories)) {
          return data.memories.map((m: any) => ({
            id: m.id,
            text: m.content,
            updatedAt: this.formatRelativeTime(m.updated_at || m.created_at),
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load memories from backend:', err);
    }
    return [];
  }

  // Create a memory
  public async createMemory(content: string): Promise<Memory | null> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/memories`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.memory.id,
          text: data.memory.content,
          updatedAt: 'Created just now',
        };
      }
    } catch (err) {
      console.warn('Failed to create memory on backend:', err);
    }
    return null;
  }

  // Update a memory
  public async updateMemory(id: string, content: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/memories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to update memory on backend:', err);
      return false;
    }
  }

  // Delete a memory
  public async deleteMemory(id: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/memories/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete memory on backend:', err);
      return false;
    }
  }

  // Helper relative time formatter
  private formatRelativeTime(dateStr: string): string {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) return 'Updated just now';
    if (diffHours < 24) return 'Updated today';
    const days = Math.floor(diffHours / 24);
    if (days === 1) return 'Updated yesterday';
    return `Updated ${days} days ago`;
  }
}

export const api = new ApiService();
