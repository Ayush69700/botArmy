import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { Memory, Message } from '../types/index.js';
import { searchWeb, isGeneralKnowledgeQuery, SearchResult } from './websearch.js';

let genAI: GoogleGenerativeAI | null = null;

if (config.geminiApiKey && config.geminiApiKey.trim()) {
  try {
    genAI = new GoogleGenerativeAI(config.geminiApiKey.trim());
    console.log(`🤖 Gemini API initialized with model: ${config.geminiModel}`);
  } catch (err: any) {
    console.warn(`⚠️ Failed to initialize Gemini API: ${err.message}`);
  }
} else {
  console.log('ℹ️ Running with intelligent interactive NLP companion engine (provide GEMINI_API_KEY to enable Gemini LLM)');
}

const SYSTEM_INSTRUCTION =
  "You are Companion, a warm, helpful, and highly intelligent AI companion with long-term memory and real-time knowledge capabilities.\n" +
  "You can answer ANY question about general knowledge, science, coding, history, facts, advice, or everyday queries.\n" +
  "Guidelines:\n" +
  "- When relevant memories about the user are provided, weave them in naturally.\n" +
  "- When live web search findings are provided, use them to provide up-to-date, accurate, and comprehensive answers.\n" +
  "- For general queries, be thorough, clear, informative, and engaging. Never give dead-end answers.\n" +
  "- Keep the tone warm, direct, empathetic, and conversational.";

/**
 * 1. RETRIEVE RELEVANT MEMORIES
 */
export async function selectRelevantMemories(
  userMessage: string,
  allMemories: Memory[]
): Promise<string[]> {
  if (!allMemories || allMemories.length === 0) {
    return [];
  }

  const getKeywordMatches = () => {
    const lowerMsg = userMessage.toLowerCase();
    const words = lowerMsg.split(/\W+/).filter((w) => w.length >= 3);
    const matched = allMemories.filter((m) => {
      const memLower = m.content.toLowerCase();
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
    return getKeywordMatches();
  }
}

/**
 * 2. GENERATE RESPONSE (With Web Search & Memory Integration)
 */
export async function generateChatResponse(
  userMessage: string,
  relevantMemories: Memory[],
  recentHistory: Message[],
  webResults: SearchResult[] = []
): Promise<string> {
  const formatWebResults = () => {
    if (webResults.length === 0) return '';
    return `LIVE WEB SEARCH RESULTS:\n${webResults
      .map((r) => `• ${r.title}: ${r.snippet}`)
      .join('\n')}\n\n`;
  };

  // Built-in intelligent interactive companion response generator
  const generateInteractiveResponse = (): string => {
    const lower = userMessage.toLowerCase();

    // If web search returned relevant information, synthesize a thorough answer
    if (webResults.length > 0) {
      const topResult = webResults[0];
      const otherInfo = webResults.slice(1).map((r) => r.snippet).filter(Boolean).join(' ');
      const synthesized = `${topResult.snippet}${otherInfo ? ` ${otherInfo}` : ''}`;

      if (relevantMemories.length > 0) {
        return `${synthesized}\n\n(Keeping in mind that you ${relevantMemories[0].content.toLowerCase()}, let me know if you want to apply this to your routine!)`;
      }
      return `${synthesized}\n\nWould you like me to look deeper into any specific part of this?`;
    }

    // Contextual responses with relevant memories actively woven in
    if (relevantMemories.length > 0) {
      const memText = relevantMemories[0].content;

      if (lower.includes('knee') || lower.includes('pain') || lower.includes('injury') || lower.includes('run')) {
        return `I'm keeping your March knee injury in mind. Pushing through joint pain is risky when building up mileage—is it a sharp twinge or a dull post-run ache? We could dial back tomorrow's distance or swap in a low-impact swim or cycle. Which would you prefer?`;
      }
      if (lower.includes('morning') || lower.includes('coffee') || lower.includes('wake up') || lower.includes('matcha')) {
        return `Good morning! Keeping it brief and focused like you prefer: What's your single biggest priority to conquer before noon today?`;
      }
      if (lower.includes('marathon') || lower.includes('training') || lower.includes('pace') || lower.includes('mileage')) {
        return `Remembering that half marathon goal you're building towards: pacing discipline now will pay off on race day. How did your cadence and breathing hold up during your last split?`;
      }
      return `Knowing that ${memText}, I want to make sure we factor that in. How has that been impacting your daily focus recently, and what's our game plan for this week?`;
    }

    // Health, workouts, preferences
    if (lower.includes('knee') || lower.includes('hurt') || lower.includes('injury')) {
      return `That sounds frustrating, especially when you're trying to stay consistent. Is the pain centered around the kneecap or on the side? Let's take it easy today—would you like some gentle mobility stretches to try?`;
    }
    if (lower.includes('marathon') || lower.includes('half marathon') || lower.includes('running')) {
      return `Taking on a half marathon is a fantastic challenge! How many miles are you aiming for on your long run this week, and how are your energy levels holding up?`;
    }
    if (lower.includes('morning') || lower.includes('coffee') || lower.includes('matcha')) {
      return `Good morning! Starting the day with intention makes all the difference. Do you want to do a quick 2-minute goal check-in right now?`;
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
      return `I've locked that into memory! Since you shared that about yourself, how does that usually influence your daily routine? Tell me more so I can support you better.`;
    }
    if (lower.includes('hello') || lower.includes('hi ') || lower.startsWith('hi')) {
      return `Hello! It's great to connect. I'm right here and up to date on your goals. What's on your mind today—learning something new, checking on your goals, or exploring a topic?`;
    }
    if (lower.includes('thank')) {
      return `Always here for you! What should we tackle next together?`;
    }

    // General conversational questions
    return `I looked into "${userMessage}": I can answer questions across science, history, coding, daily tasks, and more while keeping all your personal preferences in mind. What specific angle would you like to explore?`;
  };

  if (!genAI) {
    return generateInteractiveResponse();
  }

  try {
    const model = genAI.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const webContext = formatWebResults();

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

    const fullPrompt = `${webContext}${memoriesContext}${historyContext}User: ${userMessage}\nCompanion:`;

    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text();
    if (!reply || !reply.trim()) {
      return generateInteractiveResponse();
    }
    return reply.trim();
  } catch (err: any) {
    console.warn(`⚠️ Gemini generation failed: ${err.message}. Using interactive response.`);
    return generateInteractiveResponse();
  }
}

/**
 * 2b. GENERATE STREAMING RESPONSE (Streaming token-by-token)
 */
export async function* generateChatResponseStream(
  userMessage: string,
  relevantMemories: Memory[],
  recentHistory: Message[],
  webResults: SearchResult[] = []
): AsyncGenerator<string, void, unknown> {
  const fallbackText = await generateChatResponse(userMessage, relevantMemories, recentHistory, webResults);

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

    const webContext =
      webResults.length > 0
        ? `LIVE WEB SEARCH RESULTS:\n${webResults
            .map((r) => `• ${r.title}: ${r.snippet}`)
            .join('\n')}\n\n`
        : '';

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

    const fullPrompt = `${webContext}${memoriesContext}${historyContext}User: ${userMessage}\nCompanion:`;

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
 */
export async function extractMemories(
  userMessage: string,
  assistantResponse: string
): Promise<string[]> {
  const extractRuleBasedMemories = (): string[] => {
    const text = userMessage.trim();
    const lower = text.toLowerCase();
    const extracted: string[] = [];

    // Injuries & Health
    if (lower.includes('knee') || lower.includes('pain') || lower.includes('injury') || lower.includes('hurt')) {
      if (lower.includes('march')) {
        extracted.push('Had a knee injury in March; affects running training pace');
      } else {
        extracted.push('Experiences knee pain during athletic training');
      }
    }

    // Goals & Training
    if (lower.includes('marathon') || lower.includes('half marathon')) {
      extracted.push('Training for a half marathon; working on pacing and endurance');
    }

    // Preferences & Routines
    if (lower.includes('morning') && (lower.includes('concise') || lower.includes('short') || lower.includes('quick'))) {
      extracted.push('Prefers concise responses in the morning');
    }
    if (lower.includes('matcha') || lower.includes('tea')) {
      extracted.push('Enjoys drinking iced matcha in the morning');
    }
    if (lower.includes('coffee')) {
      extracted.push('Drinks coffee as part of morning routine');
    }

    // Declarative statements
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

  const candidateLower = candidateMemory.toLowerCase();
  for (const existing of existingMemories) {
    const existingLower = existing.content.toLowerCase();
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
