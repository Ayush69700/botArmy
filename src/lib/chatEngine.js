/**
 * Chatbot Core Engine
 * Generates conversational replies using ONLY:
 * 1. System prompt
 * 2. Top-5 retrieved memories
 * 3. Current user message
 * 
 * Never receives prior turns verbatim. Guaranteed fallback on any network/API failure.
 */

import { getFallbackChatReply } from './fallbacks.js';

export const COMPANION_SYSTEM_PROMPT = `You are a warm, attentive personal AI companion.
You speak naturally and concisely (1-3 sentences per turn), ideal for spoken voice conversation.
You visibly remember details about the user across conversations.

When relevant memories are provided below, weave them into your response naturally and smoothly—never sound robotic or say "According to my records".
If memories aren't relevant to what was just asked, simply reply warmly and helpfully.`;

/**
 * Builds the minimal context messages array for LLM completion.
 * strictly ensures NO prior turns are included.
 */
export function buildChatMessages(systemPrompt, top5Memories = [], currentMessage = '') {
  const memoryStrings = top5Memories.map(m => (typeof m === 'string' ? m : m.content));
  
  let systemContent = systemPrompt;
  if (memoryStrings.length > 0) {
    systemContent += `\n\n[RELEVANT MEMORIES ABOUT THE USER]:\n- ${memoryStrings.join('\n- ')}`;
  }

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: currentMessage }
  ];
}

/**
 * Executes a chat turn with the LLM API, strictly adhering to minimal context.
 * Automatically falls back to canned responses if API call fails or times out.
 * 
 * @param {Object} options
 * @param {string} options.userMessage - Current user message
 * @param {Array<Object|string>} options.top5Memories - Retrieved memories
 * @param {Object} options.apiConfig - { apiKey, baseUrl, model, simulateFailure }
 * @param {string} [options.systemPrompt] - Optional override
 * @returns {Promise<{ reply: string, isFallback: boolean, memoriesUsed: string[] }>}
 */
export async function generateChatReply({
  userMessage,
  top5Memories = [],
  apiConfig = {},
  systemPrompt = COMPANION_SYSTEM_PROMPT
}) {
  const memoryStrings = top5Memories.map(m => (typeof m === 'string' ? m : m.content));
  const {
    apiKey = '',
    baseUrl = 'https://api.openai.com/v1',
    model = 'gpt-4o-mini',
    simulateFailure = false
  } = apiConfig;

  // Deliberate failure simulation or no API key -> fallback immediately
  if (simulateFailure || !apiKey) {
    console.warn("[ChatEngine] Running in resilient fallback mode (API key unset or simulated failure).");
    const fallbackText = getFallbackChatReply(userMessage, memoryStrings);
    return {
      reply: fallbackText,
      isFallback: true,
      memoriesUsed: memoryStrings
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second stage timeout

    const messages = buildChatMessages(systemPrompt, top5Memories, userMessage);

    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 800 // Sufficient headroom for Gemini thinking + reply
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LLM API returned status ${response.status}`);
    }

    const data = await response.json();
    const replyText = data?.choices?.[0]?.message?.content?.trim();

    if (!replyText) {
      throw new Error("Empty response returned from LLM API");
    }

    return {
      reply: replyText,
      isFallback: false,
      memoriesUsed: memoryStrings
    };
  } catch (error) {
    console.warn("[ChatEngine] LLM Call failed or timed out. Triggering hardcoded fallback:", error.message);
    const fallbackText = getFallbackChatReply(userMessage, memoryStrings);
    return {
      reply: fallbackText,
      isFallback: true,
      memoriesUsed: memoryStrings
    };
  }
}
