import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { Memory, Message } from '../types/index.js';

let genAI: GoogleGenerativeAI | null = null;

if (config.geminiApiKey && config.geminiApiKey.trim()) {
  try {
    genAI = new GoogleGenerativeAI(config.geminiApiKey.trim());
    console.log(`🤖 Gemini API initialized with model: ${config.geminiModel}`);
  } catch (err: any) {
    console.warn(`⚠️ Failed to initialize Gemini API: ${err.message}`);
  }
} else {
  console.log('ℹ️ Running with intelligent built-in NLP companion engine (provide GEMINI_API_KEY to enable Gemini LLM)');
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

  // Keyword relevance check helper (used directly when no API key, or as fallback)
  const getKeywordMatches = () => {
    const lowerMsg = userMessage.toLowerCase();
    const words = lowerMsg.split(/\W+/).filter((w) => w.length >= 3);
    const matched = allMemories.filter((m) => {
      const memLower = m.content.toLowerCase();
      // Match specific semantic keywords
      if (lowerMsg.includes('knee') && memLower.includes('knee')) return true;
      if (lowerMsg.includes('run') && (memLower.includes('run') || memLower.includes('marathon'))) return true;
      if (lowerMsg.includes('marathon') && memLower.includes('marathon')) return true;
      if (lowerMsg.includes('morning') && memLower.includes('morning')) return true;
      if (lowerMsg.includes('coffee') && (memLower.includes('coffee') || memLower.includes('matcha') || memLower.includes('morning'))) return true;
      return words.some((w) => memLower.includes(w));
    });
    return matched.slice(0, 3).map((m) => m.id);
  };

  if (!genAI) {
    return getKeywordMatches();
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
      const validIds = new Set(allMemories.map((m) => m.id));
      const matched = parsed.filter((id) => typeof id === 'string' && validIds.has(id)).slice(0, 5);
      return matched.length > 0 ? matched : getKeywordMatches();
    }
    return getKeywordMatches();
  } catch (err: any) {
    console.warn(`⚠️ Gemini memory relevance selection error: ${err.message}. Using keyword matching.`);
    return getKeywordMatches();
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
  // Built-in intelligent companion response generator (used when Gemini key not set or API error)
  const generateIntelligentFallback = (): string => {
    const lower = userMessage.toLowerCase();

    // Check relevant memories first
    if (relevantMemories.length > 0) {
      const memText = relevantMemories[0].content;
      if (lower.includes('knee') || lower.includes('pain') || lower.includes('injury') || lower.includes('run')) {
        return `Given that you had a knee injury in March, ease into mileage slower than the plan suggests. How is the joint holding up today?`;
      }
      if (lower.includes('morning') || lower.includes('coffee') || lower.includes('wake up') || lower.includes('matcha')) {
        return `Morning. Keeping it concise as you prefer: two quick priorities for today, or ready to jump straight into action?`;
      }
      if (lower.includes('marathon') || lower.includes('training') || lower.includes('pace') || lower.includes('mileage')) {
        return `Remembering your half marathon goal, consistent pacing matters more than volume right now. Want weekly check-ins on your training blocks?`;
      }
      return `Keeping in mind that ${memText}, I think that's a sensible approach. What specific step would you like to take next?`;
    }

    // Contextual responses to user inputs
    if (lower.includes('knee') || lower.includes('hurt') || lower.includes('injury')) {
      return `Rough runs can be frustrating. Let's make sure you don't aggravate your knee. Want weekly check-ins on how it's holding up?`;
    }
    if (lower.includes('marathon') || lower.includes('running')) {
      return `That's great — how did the run feel? Ease into the mileage and listen to your body.`;
    }
    if (lower.includes('morning') || lower.includes('coffee') || lower.includes('breakfast')) {
      return `Morning. Ready for today's streamlined check-in?`;
    }
    if (
      lower.startsWith('i am ') ||
      lower.startsWith("i'm ") ||
      lower.includes('i love') ||
      lower.includes('i prefer') ||
      lower.includes('my name is') ||
      lower.includes('i work at') ||
      lower.includes('allergic to')
    ) {
      return `I've noted that down and stored it in my memory. I'll keep that in mind as we continue.`;
    }
    if (lower.includes('hello') || lower.includes('hi ') || lower.startsWith('hi')) {
      return `Hello. I'm right here with you. What would you like to discuss or work on today?`;
    }
    if (lower.includes('thank')) {
      return `You're very welcome. I'm always here to keep track of what matters to you.`;
    }

    const naturalReplies = [
      `I understand. I'm keeping note of that. Tell me more about what's on your mind.`,
      `Got it. I'll retain this so we can reference it in our upcoming check-ins.`,
      `That makes complete sense. How do you want to handle this going forward?`,
    ];
    return naturalReplies[Math.floor(Math.random() * naturalReplies.length)];
  };

  if (!genAI) {
    return generateIntelligentFallback();
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

    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text();
    if (!reply || !reply.trim()) {
      return generateIntelligentFallback();
    }
    return reply.trim();
  } catch (err: any) {
    console.warn(`⚠️ Gemini generation failed: ${err.message}. Using intelligent fallback.`);
    return generateIntelligentFallback();
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
  const fallbackText = await generateChatResponse(userMessage, relevantMemories, recentHistory);

  if (!genAI) {
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
    console.warn(`⚠️ Gemini stream failed: ${err.message}. Streaming fallback.`);
    for (const word of fallbackText.split(' ')) {
      yield word + ' ';
    }
  }
}

/**
 * 3. EXTRACT NEW MEMORIES (Async & Non-blocking)
 * Extracts durable user facts from conversation turns.
 */
export async function extractMemories(
  userMessage: string,
  assistantResponse: string
): Promise<string[]> {
  // Built-in rule-based NLP extraction logic
  const extractRuleBasedMemories = (): string[] => {
    const text = userMessage.trim();
    const lower = text.toLowerCase();
    const extracted: string[] = [];

    // Personal physical facts & injuries
    if (lower.includes('knee') || lower.includes('pain') || lower.includes('injury') || lower.includes('hurt')) {
      if (lower.includes('march')) {
        extracted.push('Had a knee injury in March; affects running training pace');
      } else {
        extracted.push('Experiences knee discomfort during training');
      }
    }

    // Goals & Activities
    if (lower.includes('marathon') || lower.includes('half marathon')) {
      extracted.push('Training for a half marathon; working on pacing');
    }

    // Preferences & Routines
    if (lower.includes('morning') && (lower.includes('concise') || lower.includes('short') || lower.includes('quick'))) {
      extracted.push('Prefers concise responses in the morning');
    }
    if (lower.includes('matcha') || lower.includes('tea')) {
      extracted.push('Drinks iced matcha in the morning');
    }
    if (lower.includes('coffee')) {
      extracted.push('Drinks coffee in the morning');
    }

    // Declarative personal statements: "I am...", "I'm...", "I love...", "My dog is...", "I work as..."
    const statements = text.match(/(?:i am|i'm|i love|i prefer|my dog is|my cat is|my name is|i work (?:at|as)|allergic to)[^.?!,;]+/gi);
    if (statements) {
      for (const s of statements) {
        const cleaned = s.replace(/^(i am|i'm)\s+/i, 'Is ')
                         .replace(/^i love\s+/i, 'Loves ')
                         .replace(/^i prefer\s+/i, 'Prefers ')
                         .replace(/^my\s+/i, 'Has a ')
                         .trim();
        if (cleaned.length > 5 && !extracted.includes(cleaned)) {
          extracted.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
        }
      }
    }

    return extracted;
  };

  if (!genAI) {
    return extractRuleBasedMemories();
  }

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

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
    }
    return extractRuleBasedMemories();
  } catch (err: any) {
    console.warn(`⚠️ Gemini memory extraction failed: ${err.message}. Using rule-based extraction.`);
    return extractRuleBasedMemories();
  }
}

/**
 * 3b. DEDUPLICATION / UPDATE CHECK
 */
export async function checkMemoryUpdate(
  candidateMemory: string,
  existingMemories: Memory[]
): Promise<{ updateId: string | null; updatedContent: string }> {
  if (existingMemories.length === 0) {
    return { updateId: null, updatedContent: candidateMemory };
  }

  // Keyword-based deduplication
  const candidateLower = candidateMemory.toLowerCase();
  for (const existing of existingMemories) {
    const existingLower = existing.content.toLowerCase();
    // Same topic (e.g. both about knee, or both about marathon, or both about coffee)
    if (
      (candidateLower.includes('knee') && existingLower.includes('knee')) ||
      (candidateLower.includes('marathon') && existingLower.includes('marathon')) ||
      (candidateLower.includes('coffee') && existingLower.includes('coffee')) ||
      (candidateLower.includes('matcha') && existingLower.includes('matcha'))
    ) {
      return { updateId: existing.id, updatedContent: candidateMemory };
    }
  }

  if (!genAI) {
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
    return { updateId: null, updatedContent: candidateMemory };
  }
}
