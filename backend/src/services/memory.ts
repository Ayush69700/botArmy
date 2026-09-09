import { db } from '../config/db.js';
import { Memory } from '../types/index.js';
import {
  selectRelevantMemories,
  extractMemories,
  checkMemoryUpdate,
} from './gemini.js';

export const memoryService = {
  async getMemories(userId: string, search?: string): Promise<Memory[]> {
    return db.getMemories(userId, search);
  },

  async getMemoryById(id: string, userId: string): Promise<Memory | null> {
    return db.getMemoryById(id, userId);
  },

  async createMemory(userId: string, content: string): Promise<Memory> {
    return db.createMemory(userId, content);
  },

  async updateMemory(id: string, userId: string, content: string): Promise<Memory | null> {
    return db.updateMemory(id, userId, content);
  },

  async deleteMemory(id: string, userId: string): Promise<boolean> {
    return db.deleteMemory(id, userId);
  },

  /**
   * Identifies memories relevant to a new user message
   */
  async retrieveRelevantMemories(
    userId: string,
    userMessage: string
  ): Promise<{ memoryIds: string[]; memories: Memory[] }> {
    const allMemories = await db.getMemories(userId);
    if (allMemories.length === 0) {
      return { memoryIds: [], memories: [] };
    }

    const relevantIds = await selectRelevantMemories(userMessage, allMemories);
    const memoryMap = new Map(allMemories.map((m) => [m.id, m]));
    const matchedMemories = relevantIds
      .map((id) => memoryMap.get(id))
      .filter((m): m is Memory => !!m);

    return { memoryIds: relevantIds, memories: matchedMemories };
  },

  /**
   * Async, non-blocking memory extraction and deduplication/update
   */
  async processAndStoreNewMemories(
    userId: string,
    userMessage: string,
    assistantResponse: string,
    sourceMessageId?: string
  ): Promise<void> {
    try {
      const extractedFacts = await extractMemories(userMessage, assistantResponse);
      if (!extractedFacts || extractedFacts.length === 0) return;

      const existingMemories = await db.getMemories(userId);

      for (const fact of extractedFacts) {
        // Check if this fact updates or matches an existing memory
        const { updateId, updatedContent } = await checkMemoryUpdate(fact, existingMemories);

        if (updateId) {
          await db.updateMemory(updateId, userId, updatedContent);
          console.log(`🧠 Updated existing memory [${updateId}]: "${updatedContent}"`);
        } else {
          const created = await db.createMemory(userId, updatedContent, sourceMessageId);
          console.log(`🧠 Stored new memory [${created.id}]: "${updatedContent}"`);
        }
      }
    } catch (err: any) {
      // Memory extraction failures must never block or fail the chat response
      console.warn(`⚠️ Memory extraction background process error: ${err.message}`);
    }
  },
};
