/**
 * Memory Extraction Pipeline
 * Analyzes ONLY the latest user message and returns structured JSON:
 * {
 *   "facts": string[],
 *   "preferences": string[],
 *   "mood": string | null
 * }
 * Strictly decoupled: never sends prior turns, logs and skips on malformed JSON.
 */

import { addMemory } from './memoryStore.js';
import { detectMessageTags } from './retrieval.js';
import { getFallbackExtraction } from './fallbacks.js';

const EXTRACTION_SYSTEM_PROMPT = `You are a precise memory extraction engine.
Analyze ONLY the user message provided. Extract any concrete personal facts, preferences, or emotional moods mentioned.

You must respond with ONLY a valid, raw JSON object matching this schema exactly:
{
  "facts": ["string"],
  "preferences": ["string"],
  "mood": "string or null"
}

Guidelines:
- facts: Objective details about the user's life, family, school, work, projects, habits, or routine.
- preferences: Specific likes, dislikes, favorite artists, food/drinks, tools, or styles.
- mood: User's current feelings, stress level, energy, or emotional tone (or null if neutral/absent).
- If no information exists for a category, use an empty array [] or null for mood.
- Output raw JSON only. Do not include markdown codeblocks or conversational text.`;

/**
 * Assigns an appropriate tag to extracted content.
 * Supported tags: 'school' | 'work' | 'family' | 'mood' | 'music' | 'social' | 'other'
 */
function determineTag(content, messageTags = []) {
  const lower = content.toLowerCase();

  if (/(sister|brother|mom|dad|mother|father|family|maya|parent)/i.test(lower)) return 'family';
  if (/(music|artist|song|track|listen|album|spotify|band|electronic|indie)/i.test(lower)) return 'music';
  if (/(school|college|university|capstone|exam|study|studying|course|class|robotics|rover)/i.test(lower)) return 'school';
  if (/(work|job|boss|office|code|deploy|company|software|developer)/i.test(lower)) return 'work';
  if (/(bouldering|climb|gym|friend|friends|hangout|party|social)/i.test(lower)) return 'social';
  if (/(tired|stressed|exhausted|happy|excited|anxious|sleep|burnout)/i.test(lower)) return 'mood';

  if (messageTags.length > 0) {
    return messageTags[0];
  }

  return 'other';
}

/**
 * Clean potential markdown wrappers (e.g. ```json ... ```).
 */
function cleanJsonString(str) {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Extracts facts, preferences, and mood from ONLY the latest user message.
 * @param {Object} options
 * @param {string} options.userMessage - Latest user message
 * @param {number} options.turn - Current turn number
 * @param {Object} options.apiConfig - { apiKey, baseUrl, model, simulateFailure }
 * @returns {Promise<{ facts: string[], preferences: string[], mood: string|null }>}
 */
export async function extractAndStoreMemories({
  userMessage,
  turn,
  apiConfig = {}
}) {
  if (!userMessage || !userMessage.trim()) {
    return { facts: [], preferences: [], mood: null };
  }

  const {
    apiKey = '',
    baseUrl = 'https://api.openai.com/v1',
    model = 'gpt-4o-mini',
    simulateFailure = false
  } = apiConfig;

  let extractionResult = null;

  // If deliberate failure simulated or no API key, invoke safe fallback
  if (simulateFailure || !apiKey) {
    console.log("[Extraction] Operating in fallback mode (no API key or simulated error)");
    extractionResult = getFallbackExtraction(userMessage);
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      let response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ]
        }),
        signal: controller.signal
      });

      // Automatic quota failover for Gemini
      if ((response.status === 429 || response.status === 404) && baseUrl.includes('google') && model !== 'gemini-3.5-flash-lite') {
        console.warn(`[Extraction] Model ${model} returned ${response.status}. Retrying with gemini-3.5-flash-lite...`);
        response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gemini-3.5-flash-lite',
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
              { role: 'user', content: userMessage }
            ]
          }),
          signal: controller.signal
        });
      }

      // Automatic failover for Groq
      if ((response.status === 429 || response.status === 404) && baseUrl.includes('groq')) {
        const fallbackGroqModel = model === 'openai/gpt-oss-120b' ? 'openai/gpt-oss-20b' : 'openai/gpt-oss-120b';
        console.warn(`[Extraction] Groq model ${model} returned ${response.status}. Retrying with ${fallbackGroqModel}...`);
        response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: fallbackGroqModel,
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
              { role: 'user', content: userMessage }
            ]
          }),
          signal: controller.signal
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Extraction HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.choices?.[0]?.message?.content || '';
      const cleaned = cleanJsonString(rawText);

      extractionResult = JSON.parse(cleaned);
    } catch (err) {
      console.warn("[Extraction Pipeline] Error / Malformed JSON received. Skipping silently:", err.message);
      // Fail quiet to audience, fallback gracefully
      extractionResult = getFallbackExtraction(userMessage);
    }
  }

  // Validate extracted shape
  if (!extractionResult || typeof extractionResult !== 'object') {
    return { facts: [], preferences: [], mood: null };
  }

  const facts = Array.isArray(extractionResult.facts) ? extractionResult.facts : [];
  const preferences = Array.isArray(extractionResult.preferences) ? extractionResult.preferences : [];
  const mood = extractionResult.mood && typeof extractionResult.mood === 'string' ? extractionResult.mood : null;

  const detectedTags = detectMessageTags(userMessage);

  // Store in MemoryStorage
  facts.forEach(fact => {
    if (fact && fact.trim()) {
      addMemory({
        type: 'fact',
        content: fact.trim(),
        tag: determineTag(fact, detectedTags),
        turn,
        source: 'conversation'
      });
    }
  });

  preferences.forEach(pref => {
    if (pref && pref.trim()) {
      addMemory({
        type: 'preference',
        content: pref.trim(),
        tag: determineTag(pref, detectedTags),
        turn,
        source: 'conversation'
      });
    }
  });

  if (mood && mood.trim()) {
    addMemory({
      type: 'mood',
      content: `User is feeling ${mood.trim()}`,
      tag: 'mood',
      turn,
      source: 'conversation'
    });
  }

  return { facts, preferences, mood };
}
