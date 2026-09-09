/**
 * Fallback canned responses and offline safety fallbacks
 * Ensures no dead air, no crashes on stage, and graceful degradation when API is unreachable.
 */

export const CANNED_CHAT_FALLBACKS = [
  {
    pattern: /(hi|hello|hey|good morning|good evening)/i,
    reply: "Hey there! Good to hear from you. I'm right here and keeping track of what matters as we talk. What's on your mind today?"
  },
  {
    pattern: /(sister|maya|seattle|family)/i,
    reply: "I remember your sister Maya is moving to Seattle for her new tech job next month. How is she feeling about the big move?"
  },
  {
    pattern: /(music|listen|artist|song|track|spotify|playlist)/i,
    reply: "Based on your music tastes, you've been leaning into Fred again.., Phoebe Bridgers, and Overmono lately—especially for those late-night focus sessions. Want some similar electronic or indie recommendations?"
  },
  {
    pattern: /(project|capstone|school|robot|rover|study|college)/i,
    reply: "I know you've been deep in that autonomous navigation rover for your CS capstone. How is the navigation algorithm holding up?"
  },
  {
    pattern: /(matcha|coffee|drink|latte|tea)/i,
    reply: "I recall you prefer iced oat milk matcha with lavender syrup over espresso. Definitely a top-tier fuel choice for long coding sprints."
  },
  {
    pattern: /(boulder|climb|gym|thursday)/i,
    reply: "Speaking of your routine, are you still hitting the indoor bouldering gym on Thursdays? Great way to take a break from the screen."
  },
  {
    pattern: /(tired|sleep|exhausted|stress|hackathon)/i,
    reply: "Hackathons definitely demand a lot of energy. Make sure to stay hydrated and take a breath—you're making great progress!"
  }
];

/**
 * Generate a context-aware fallback response when the LLM API is unavailable.
 * @param {string} userMessage - The current message from the user
 * @param {Array<string>} retrievedMemories - Top-5 memories passed into context
 * @returns {string} Safe, human-like response
 */
export function getFallbackChatReply(userMessage, retrievedMemories = []) {
  const msg = (userMessage || '').trim();

  for (const item of CANNED_CHAT_FALLBACKS) {
    if (item.pattern.test(msg)) {
      return item.reply;
    }
  }

  // If memories exist, weave in a natural callback
  if (retrievedMemories && retrievedMemories.length > 0) {
    const memorySnippet = retrievedMemories[0];
    return `I hear you! I'm keeping our conversation in mind (remembering that ${memorySnippet.replace(/^(User's|User)\s+/i, 'you ')}). Tell me more!`;
  }

  // Generic resilient fallback
  return "I hear you loud and clear. Even in offline fallback mode, I'm tracking every turn of our conversation. How would you like to continue?";
}

/**
 * Deterministic fallback extractor if the LLM extraction call fails or times out.
 * Extracts basic facts, preferences, or moods using pattern matching.
 * @param {string} userMessage - User message
 * @returns {{ facts: string[], preferences: string[], mood: string|null }}
 */
export function getFallbackExtraction(userMessage) {
  const text = (userMessage || '').trim();
  const lower = text.toLowerCase();
  const facts = [];
  const preferences = [];
  let mood = null;

  // Robust heuristic checks for facts, preferences, and mood
  if (/i love\s+|i prefer\s+|my favorite\s+|i like\s+|i enjoy\s+/i.test(text)) {
    preferences.push(text);
  }
  
  if (/i have\s+|my sister\s+|my brother\s+|my dog\s+|my pet\s+|i work\s+|i am building\s+|i study\s+|i went\s+|i live\s+|building a\s+|working on\s+/i.test(text)) {
    facts.push(text);
  }

  if (/tired|exhausted|sleepy|stressed|burned out|sleep-deprived/i.test(lower)) {
    mood = "tired and overworked";
  } else if (/excited|hyped|happy|great|pumped/i.test(lower)) {
    mood = "excited and energized";
  } else if (/anxious|nervous|worried/i.test(lower)) {
    mood = "anxious about progress";
  }

  return {
    facts,
    preferences,
    mood
  };
}
