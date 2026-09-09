import { db } from '../config/db.js';
import { Message, Memory } from '../types/index.js';
import { memoryService } from './memory.js';
import { generateChatResponse, generateChatResponseStream } from './gemini.js';

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

    // 2. Retrieve relevant memories (cheap prompt)
    const { memoryIds, memories: usedMemories } = await memoryService.retrieveRelevantMemories(
      userId,
      content
    );

    // 3. Fetch recent history (last 15 messages, ordered chronologically for Gemini)
    const recentMessages = await db.getMessages(conversation.id, 15);
    // Exclude the message we just inserted so it isn't duplicated in history
    const historyBeforeCurrent = recentMessages
      .filter((m) => m.id !== userMessage.id)
      .reverse();

    // 4. Generate assistant response
    const assistantReplyText = await generateChatResponse(
      content,
      usedMemories,
      historyBeforeCurrent
    );

    // 5. Save assistant message with used_memory_ids
    const assistantMessage = await db.createMessage(
      conversation.id,
      'assistant',
      assistantReplyText,
      memoryIds.length > 0 ? memoryIds : null
    );

    // 6. Asynchronously extract new memories (non-blocking!)
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

    // 3. Fetch recent history
    const recentMessages = await db.getMessages(conversation.id, 15);
    const historyBeforeCurrent = recentMessages
      .filter((m) => m.id !== userMessage.id)
      .reverse();

    // 4. Stream response
    let fullResponseText = '';
    for await (const chunk of generateChatResponseStream(
      content,
      usedMemories,
      historyBeforeCurrent
    )) {
      fullResponseText += chunk;
      yield { type: 'chunk', text: chunk };
    }

    // 5. Save assistant message
    const assistantMessage = await db.createMessage(
      conversation.id,
      'assistant',
      fullResponseText,
      memoryIds.length > 0 ? memoryIds : null
    );

    // 6. Async memory extraction
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
