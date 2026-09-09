import { db } from '../config/db.js';
import { Message, Memory } from '../types/index.js';
import { memoryService } from './memory.js';
import { generateChatResponse, generateChatResponseStream } from './gemini.js';
import { searchWeb, isGeneralKnowledgeQuery, SearchResult } from './websearch.js';

export interface ChatMessageResult {
  userMessage: Message;
  assistantMessage: Message;
  usedMemories: Memory[];
}

export const chatService = {
  /**
   * Process incoming user message (HTTP non-streaming path)
   */
  async processMessage(userId: string, content: string): Promise<ChatMessageResult> {
    const conversation = await db.getOrCreateConversation(userId);

    // 1. Save user message
    const userMessage = await db.createMessage(conversation.id, 'user', content);

    // 2. Retrieve relevant memories (cheap prompt / keyword matching)
    const { memoryIds, memories: usedMemories } = await memoryService.retrieveRelevantMemories(
      userId,
      content
    );

    // 3. Search the web if it's a general knowledge or factual question
    let webResults: SearchResult[] = [];
    if (isGeneralKnowledgeQuery(content)) {
      try {
        webResults = await searchWeb(content);
      } catch {
        webResults = [];
      }
    }

    // 4. Fetch recent history (last 15 messages, ordered chronologically for Gemini)
    const recentMessages = await db.getMessages(conversation.id, 15);
    const historyBeforeCurrent = recentMessages
      .filter((m) => m.id !== userMessage.id)
      .reverse();

    // 5. Generate assistant response with live web search & memories
    const assistantReplyText = await generateChatResponse(
      content,
      usedMemories,
      historyBeforeCurrent,
      webResults
    );

    // 6. Save assistant message with used_memory_ids
    const assistantMessage = await db.createMessage(
      conversation.id,
      'assistant',
      assistantReplyText,
      memoryIds.length > 0 ? memoryIds : null
    );

    // 7. Asynchronously extract new memories (non-blocking!)
    setImmediate(() => {
      memoryService.processAndStoreNewMemories(
        userId,
        content,
        assistantReplyText,
        userMessage.id
      ).catch((err) => {
        console.warn('Memory extraction background error:', err);
      });
    });

    return {
      userMessage,
      assistantMessage,
      usedMemories,
    };
  },

  /**
   * Streaming chat response generator for WebSocket /api/chat/stream
   */
  async *processMessageStream(
    userId: string,
    content: string
  ): AsyncGenerator<
    | { type: 'chunk'; text: string }
    | {
        type: 'complete';
        userMessage: Message;
        assistantMessage: Message;
        usedMemories: Memory[];
      },
    void,
    unknown
  > {
    const conversation = await db.getOrCreateConversation(userId);

    // 1. Save user message
    const userMessage = await db.createMessage(conversation.id, 'user', content);

    // 2. Retrieve relevant memories
    const { memoryIds, memories: usedMemories } = await memoryService.retrieveRelevantMemories(
      userId,
      content
    );

    // 3. Search the web if needed
    let webResults: SearchResult[] = [];
    if (isGeneralKnowledgeQuery(content)) {
      try {
        webResults = await searchWeb(content);
      } catch {
        webResults = [];
      }
    }

    // 4. Fetch recent history
    const recentMessages = await db.getMessages(conversation.id, 15);
    const historyBeforeCurrent = recentMessages
      .filter((m) => m.id !== userMessage.id)
      .reverse();

    // 5. Stream response
    let fullResponseText = '';
    for await (const chunk of generateChatResponseStream(
      content,
      usedMemories,
      historyBeforeCurrent,
      webResults
    )) {
      fullResponseText += chunk;
      yield { type: 'chunk', text: chunk };
    }

    // 6. Save assistant message
    const assistantMessage = await db.createMessage(
      conversation.id,
      'assistant',
      fullResponseText,
      memoryIds.length > 0 ? memoryIds : null
    );

    // 7. Async memory extraction
    setImmediate(() => {
      memoryService.processAndStoreNewMemories(
        userId,
        content,
        fullResponseText,
        userMessage.id
      ).catch((err) => {
        console.warn('Memory extraction background error:', err);
      });
    });

    yield {
      type: 'complete',
      userMessage,
      assistantMessage,
      usedMemories,
    };
  },

  /**
   * Retrieve conversation history
   */
  async getChatHistory(userId: string, limit = 50): Promise<Message[]> {
    const conversation = await db.getOrCreateConversation(userId);
    return db.getMessages(conversation.id, limit);
  },
};
