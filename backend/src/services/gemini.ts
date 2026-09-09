import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { Memory, Message } from '../types/index.js';

let genAI: GoogleGenerativeAI | null = null;

if (config.geminiApiKey) {
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
}

const SYSTEM_INSTRUCTION =
  "You are Companion, a warm, direct AI companion. You have some relevant memories about this user, provided below. Reference them naturally when relevant to the conversation, don't just recite them. Do not mention memories that aren't provided to you, even if you might guess them.";

/**
 * 1. RETRIEVE RELEVANT MEMORIES
 * SCALE NOTE: For MVP/hackathon scope, sending memory summaries to Gemini to pick relevant ones
 * is optimal and keeps operational overhead minimal (most users will have under 100 memories).
 * For production scale (>500 memories), consider an embedding pipeline or vector index (e.g. pgvector).
 */
export async function selectRelevantMemories(
  userMessage: string,
  allMemories: Memory[]
): Promise<string[]> {
  if (!allMemories || allMemories.length === 0) {
    return [];
  }

  // If no Gemini API key configured, use simple keyword relevance fallback
  if (!genAI) {
    const words = userMessage.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const matched = allMemories.filter((m) =>
      words.some((w) => m.content.toLowerCase().includes(w))
    );
    return matched.slice(0, 3).map((m) => m.id);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const memoryListSnippet = allMemories.map((m) => ({ id: m.id, memory: m.content }));

    const prompt = `You are a memory relevance classifier.
User Message: "${userMessage}"

Available User Memories:
${JSON.stringify(memoryListSnippet)}

Task: Identify which memories (if any) are directly relevant to understanding or responding to the User Message.
Rules:
- Select only clearly relevant memories (max 5).
- If no memories are directly relevant, return an empty array [].
- DO NOT force memory usage. False positives mislead the user.
- Output strictly a JSON array of matching memory ID strings. Example: ["id1", "id2"] or []`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      // Validate that returned IDs exist in allMemories
      const validIds = new Set(allMemories.map((m) => m.id));
      return parsed.filter((id) => typeof id === 'string' && validIds.has(id)).slice(0, 5);
    }
    return [];
  } catch (err: any) {
    console.warn(`⚠️ Memory relevance selection error: ${err.message}. Defaulting to empty list.`);
    return [];
  }
}

/**
 * 2. GENERATE RESPONSE (Non-Streaming)
 */
export async function generateChatResponse(
  userMessage: string,
  relevantMemories: Memory[],
  recentHistory: Message[]
): Promise<string> {
  if (!genAI) {
    // Graceful fallback for local development if key not yet supplied
    if (relevantMemories.length > 0) {
      return `I remember that ${relevantMemories[0].content}. Let's work through this together.`;
    }
    return `I'm listening and right here with you.`;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Format injected memories
    const memoriesContext =
      relevantMemories.length > 0
        ? `RELEVANT MEMORIES ABOUT THIS USER:\n${relevantMemories
            .map((m) => `- ${m.content}`)
            .join('\n')}\n\n`
        : '';

    // Format last ~15 messages (history)
    // Note: recentHistory passed in is sorted chronologically oldest to newest
    const historyContext =
      recentHistory.length > 0
        ? `CONVERSATION HISTORY:\n${recentHistory
            .map((m) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
            .join('\n')}\n\n`
        : '';

    const fullPrompt = `${memoriesContext}${historyContext}User: ${userMessage}\nCompanion:`;

    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text();
    if (!reply || !reply.trim()) {
      throw new Error('Empty response from model');
    }
    return reply.trim();
  } catch (err: any) {
    console.error(`Gemini generation error: ${err.message}`);
    throw new Error('assistant_unavailable');
  }
}

/**
 * 2b. GENERATE STREAMING RESPONSE (Streaming token-by-token)
 */
export async function* generateChatResponseStream(
  userMessage: string,
  relevantMemories: Memory[],
  recentHistory: Message[]
): AsyncGenerator<string, void, unknown> {
  if (!genAI) {
    const fallbackText =
      relevantMemories.length > 0
        ? `I remember that ${relevantMemories[0].content}. Let's discuss further.`
        : `I'm listening and right here with you.`;
    for (const word of fallbackText.split(' ')) {
      yield word + ' ';
    }
    return;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const memoriesContext =
      relevantMemories.length > 0
        ? `RELEVANT MEMORIES ABOUT THIS USER:\n${relevantMemories
            .map((m) => `- ${m.content}`)
            .join('\n')}\n\n`
        : '';

    const historyContext =
      recentHistory.length > 0
        ? `CONVERSATION HISTORY:\n${recentHistory
            .map((m) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
            .join('\n')}\n\n`
        : '';

    const fullPrompt = `${memoriesContext}${historyContext}User: ${userMessage}\nCompanion:`;

    const streamResult = await model.generateContentStream(fullPrompt);
    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  } catch (err: any) {
    console.error(`Gemini stream error: ${err.message}`);
    throw new Error('assistant_unavailable');
  }
}

/**
 * 3. EXTRACT NEW MEMORIES (Async & Non-blocking)
 */
export async function extractMemories(
  userMessage: string,
  assistantResponse: string
): Promise<string[]> {
  if (!genAI) return [];

  try {
    const model = genAI.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = `Given this exchange between a User and their AI Companion:
User: "${userMessage}"
Companion: "${assistantResponse}"

Task: Extract any new, durable facts worth remembering about the user long-term (e.g. personal preferences, physical conditions/injuries, ongoing goals, hobbies, family/friends, work context, lifestyle).
Rules:
- Ignore small talk, greetings, immediate logistical queries, and one-off details.
- Express each memory in plain, third-person natural language (e.g. "Had a knee injury in March; affects running training pace", "Prefers concise responses in the morning").
- Return strictly a JSON array of plain strings. Example: ["Prefers decaf coffee", "Training for a half marathon"] or [].
- If nothing is worth storing long-term, return [].`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
    }
    return [];
  } catch (err: any) {
    console.warn(`⚠️ Memory extraction failed (non-blocking): ${err.message}`);
    return [];
  }
}

/**
 * 3b. DEDUPLICATION / UPDATE CHECK
 * Checks if candidateMemory updates or matches an existing memory for the user.
 * Returns the matching memory ID if it should update that memory, or null if it's new.
 */
export async function checkMemoryUpdate(
  candidateMemory: string,
  existingMemories: Memory[]
): Promise<{ updateId: string | null; updatedContent: string }> {
  if (!genAI || existingMemories.length === 0) {
    return { updateId: null, updatedContent: candidateMemory };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const snippet = existingMemories.map((m) => ({ id: m.id, content: m.content }));

    const prompt = `You are a memory deduplication and update resolver.
New candidate memory: "${candidateMemory}"

Existing user memories:
${JSON.stringify(snippet)}

Task: Determine if the candidate memory updates, clarifies, or duplicates an existing memory from the list.
Rules:
- If it relates to the same topic/fact and provides an update or fresher state, return the "updateId" of that existing memory, along with the consolidated "updatedContent".
- If it is a completely new and distinct fact, return "updateId": null and "updatedContent": "${candidateMemory}".
- Output strictly JSON:
  { "updateId": "<existing_id>" | null, "updatedContent": "<consolidated text>" }`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    if (parsed && typeof parsed === 'object') {
      const matchingId =
        parsed.updateId && existingMemories.some((m) => m.id === parsed.updateId)
          ? parsed.updateId
          : null;
      return {
        updateId: matchingId,
        updatedContent: parsed.updatedContent || candidateMemory,
      };
    }
    return { updateId: null, updatedContent: candidateMemory };
  } catch (err: any) {
    console.warn(`⚠️ Memory deduplication check failed: ${err.message}`);
    return { updateId: null, updatedContent: candidateMemory };
  }
}
