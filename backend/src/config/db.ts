import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config } from './env.js';
import { User, Conversation, Message, Memory } from '../types/index.js';

const { Pool } = pg;

// In-Memory fallback store for development when PostgreSQL is not running
class InMemoryStore {
  users: Map<string, User> = new Map();
  conversations: Map<string, Conversation> = new Map();
  messages: Map<string, Message> = new Map();
  memories: Map<string, Memory> = new Map();

  async init() {
    console.log('ℹ️ Running with in-memory database store (configure DATABASE_URL for PostgreSQL)');
  }

  // Users
  async createUser(email: string, passwordHash: string): Promise<User> {
    const user: User = {
      id: uuidv4(),
      email,
      password_hash: passwordHash,
      created_at: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  // Conversations
  async getOrCreateConversation(userId: string): Promise<Conversation> {
    for (const conv of this.conversations.values()) {
      if (conv.user_id === userId) return conv;
    }
    const conv: Conversation = {
      id: uuidv4(),
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.conversations.set(conv.id, conv);
    return conv;
  }

  // Messages
  async createMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    usedMemoryIds?: string[] | null
  ): Promise<Message> {
    const msg: Message = {
      id: uuidv4(),
      conversation_id: conversationId,
      role,
      content,
      used_memory_ids: usedMemoryIds || null,
      created_at: new Date(),
    };
    this.messages.set(msg.id, msg);

    // Bump conversation updated_at
    const conv = this.conversations.get(conversationId);
    if (conv) conv.updated_at = new Date();

    return msg;
  }

  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const list: Message[] = [];
    for (const m of this.messages.values()) {
      if (m.conversation_id === conversationId) list.push(m);
    }
    // Most recent first
    list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return list.slice(0, limit);
  }

  // Memories
  async getMemories(userId: string, search?: string): Promise<Memory[]> {
    const list: Memory[] = [];
    for (const m of this.memories.values()) {
      if (m.user_id === userId) {
        if (!search || m.content.toLowerCase().includes(search.toLowerCase().trim())) {
          list.push(m);
        }
      }
    }
    list.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    return list;
  }

  async getMemoryById(id: string, userId: string): Promise<Memory | null> {
    const m = this.memories.get(id);
    if (m && m.user_id === userId) return m;
    return null;
  }

  async createMemory(
    userId: string,
    content: string,
    sourceMessageId?: string | null
  ): Promise<Memory> {
    const mem: Memory = {
      id: uuidv4(),
      user_id: userId,
      content,
      source_message_id: sourceMessageId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.memories.set(mem.id, mem);
    return mem;
  }

  async updateMemory(id: string, userId: string, content: string): Promise<Memory | null> {
    const mem = await this.getMemoryById(id, userId);
    if (!mem) return null;
    mem.content = content;
    mem.updated_at = new Date();
    return mem;
  }

  async deleteMemory(id: string, userId: string): Promise<boolean> {
    const mem = await this.getMemoryById(id, userId);
    if (!mem) return false;
    return this.memories.delete(id);
  }
}

let pool: pg.Pool | null = null;
let useInMemory = false;
const inMemoryStore = new InMemoryStore();

export async function initDb() {
  if (!config.databaseUrl) {
    useInMemory = true;
    await inMemoryStore.init();
    return;
  }

  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Schema initialization
    const schemaSql = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        used_memory_ids UUID[] DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    `;

    await client.query(schemaSql);
    client.release();
    console.log('✅ Database schema verified');
  } catch (err: any) {
    console.warn(`⚠️ PostgreSQL connection failed: ${err.message}. Falling back to in-memory store.`);
    useInMemory = true;
    await inMemoryStore.init();
  }
}

// Unified Database Access Layer
export const db = {
  // Users
  async createUser(email: string, passwordHash: string): Promise<User> {
    if (useInMemory || !pool) return inMemoryStore.createUser(email, passwordHash);
    const res = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, passwordHash]
    );
    return res.rows[0];
  },

  async findUserByEmail(email: string): Promise<User | null> {
    if (useInMemory || !pool) return inMemoryStore.findUserByEmail(email);
    const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0] || null;
  },

  async findUserById(id: string): Promise<User | null> {
    if (useInMemory || !pool) return inMemoryStore.findUserById(id);
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  // Conversations
  async getOrCreateConversation(userId: string): Promise<Conversation> {
    if (useInMemory || !pool) return inMemoryStore.getOrCreateConversation(userId);
    const existing = await pool.query(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    if (existing.rows.length > 0) return existing.rows[0];

    const created = await pool.query(
      'INSERT INTO conversations (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return created.rows[0];
  },

  // Messages
  async createMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    usedMemoryIds?: string[] | null
  ): Promise<Message> {
    if (useInMemory || !pool) {
      return inMemoryStore.createMessage(conversationId, role, content, usedMemoryIds);
    }
    const res = await pool.query(
      'INSERT INTO messages (conversation_id, role, content, used_memory_ids) VALUES ($1, $2, $3, $4) RETURNING *',
      [conversationId, role, content, usedMemoryIds || null]
    );
    await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      conversationId,
    ]);
    return res.rows[0];
  },

  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    if (useInMemory || !pool) return inMemoryStore.getMessages(conversationId, limit);
    const res = await pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
      [conversationId, limit]
    );
    return res.rows;
  },

  // Memories
  async getMemories(userId: string, search?: string): Promise<Memory[]> {
    if (useInMemory || !pool) return inMemoryStore.getMemories(userId, search);
    if (search && search.trim()) {
      const res = await pool.query(
        'SELECT * FROM memories WHERE user_id = $1 AND content ILIKE $2 ORDER BY updated_at DESC',
        [userId, `%${search.trim()}%`]
      );
      return res.rows;
    }
    const res = await pool.query(
      'SELECT * FROM memories WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return res.rows;
  },

  async getMemoryById(id: string, userId: string): Promise<Memory | null> {
    if (useInMemory || !pool) return inMemoryStore.getMemoryById(id, userId);
    const res = await pool.query('SELECT * FROM memories WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    return res.rows[0] || null;
  },

  async createMemory(
    userId: string,
    content: string,
    sourceMessageId?: string | null
  ): Promise<Memory> {
    if (useInMemory || !pool) return inMemoryStore.createMemory(userId, content, sourceMessageId);
    const res = await pool.query(
      'INSERT INTO memories (user_id, content, source_message_id) VALUES ($1, $2, $3) RETURNING *',
      [userId, content, sourceMessageId || null]
    );
    return res.rows[0];
  },

  async updateMemory(id: string, userId: string, content: string): Promise<Memory | null> {
    if (useInMemory || !pool) return inMemoryStore.updateMemory(id, userId, content);
    const res = await pool.query(
      'UPDATE memories SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [content, id, userId]
    );
    return res.rows[0] || null;
  },

  async deleteMemory(id: string, userId: string): Promise<boolean> {
    if (useInMemory || !pool) return inMemoryStore.deleteMemory(id, userId);
    const res = await pool.query('DELETE FROM memories WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    return (res.rowCount ?? 0) > 0;
  },
};
