/**
 * Plain JS Keyword and Tag-Based Retrieval Engine
 * Scores stored memories + static enrichment entries against the current message.
 * Returns exactly top 5 memories. If none score > 0, returns the 5 most recent.
 * Zero embeddings, zero external API calls.
 */

import { getMemories } from './memoryStore.js';
import { getEnrichmentMemories } from './enrichment.js';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t',
  'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is',
  'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most',
  'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should',
  'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they',
  'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d',
  'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom',
  'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  'tell', 'know', 'think', 'like', 'just', 'well', 'really'
]);

const TAG_KEYWORDS = {
  music: ['music', 'song', 'songs', 'artist', 'artists', 'listen', 'listening', 'spotify', 'track', 'tracks', 'album', 'band', 'sound', 'beats', 'indie', 'electronic', 'ambient', 'fred', 'overmono', 'phoebe', 'tet'],
  school: ['school', 'university', 'college', 'capstone', 'project', 'class', 'course', 'exam', 'studying', 'study', 'robotics', 'rover', 'cs', 'degree', 'professor'],
  work: ['work', 'job', 'office', 'career', 'boss', 'code', 'coding', 'deploy', 'software', 'company', 'developer', 'architecture', 'project'],
  family: ['family', 'sister', 'brother', 'mom', 'dad', 'mother', 'father', 'parents', 'sibling', 'maya', 'seattle'],
  mood: ['mood', 'feel', 'feeling', 'tired', 'exhausted', 'sleep', 'stress', 'stressed', 'happy', 'excited', 'energy', 'burnout', 'overwhelmed'],
  social: ['social', 'friend', 'friends', 'hangout', 'party', 'climb', 'bouldering', 'gym', 'boulder', 'coffee', 'thursday', 'weekend', 'buddies', 'teammate', 'nihal', 'ayush']
};

/**
 * Tokenizes text into lowercase normalized keywords, excluding stopwords.
 * @param {string} text 
 * @returns {string[]}
 */
export function extractKeywords(text) {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter(Boolean);
  return tokens.filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Detects tags present in the message text.
 * @param {string} text 
 * @returns {string[]}
 */
export function detectMessageTags(text) {
  const lower = (text || '').toLowerCase();
  const matchedTags = [];

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matchedTags.push(tag);
    }
  }

  return matchedTags;
}

/**
 * Scores a memory against user message keywords and detected tags.
 * @param {Object} memory 
 * @param {string[]} messageKeywords 
 * @param {string[]} detectedTags 
 * @returns {number}
 */
function scoreMemory(memory, messageKeywords, detectedTags) {
  let score = 0;
  const memoryContentLower = (memory.content || '').toLowerCase();
  const memoryWords = new Set(extractKeywords(memoryContentLower));

  // Tag bonus: +3 points if tags align
  if (memory.tag && detectedTags.includes(memory.tag)) {
    score += 3;
  }

  // Exact keyword overlap: +2 points each
  for (const kw of messageKeywords) {
    if (memoryWords.has(kw)) {
      score += 2;
    } else if (memoryContentLower.includes(kw)) {
      score += 1;
    }
  }

  return score;
}

/**
 * Retrieves top-5 relevant memories for a message.
 * Adheres strictly to the spec:
 * 1. Score stored memories + enrichment by tag/keyword overlap.
 * 2. Return top 5.
 * 3. If nothing scores above zero, return the 5 most recent by turn number.
 * 
 * @param {string} userMessage - Current user message
 * @param {Array<Object>} [explicitMemories] - Optional memory list override
 * @returns {Array<Object>} Array of up to 5 memory objects
 */
export function retrieveTop5Memories(userMessage, explicitMemories = null) {
  const stored = explicitMemories || getMemories();
  const enrichment = getEnrichmentMemories();
  const allCandidates = [...stored, ...enrichment];

  if (allCandidates.length === 0) {
    return [];
  }

  const messageKeywords = extractKeywords(userMessage);
  const detectedTags = detectMessageTags(userMessage);

  // Score each candidate
  const scoredCandidates = allCandidates.map(mem => ({
    memory: mem,
    score: scoreMemory(mem, messageKeywords, detectedTags)
  }));

  // Filter positive scores
  const matched = scoredCandidates
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.memory.turn || 0) - (a.memory.turn || 0);
    });

  if (matched.length >= 5) {
    return matched.slice(0, 5).map(item => item.memory);
  }

  // If matched has items, start with them
  const selected = matched.map(item => item.memory);
  const selectedIds = new Set(selected.map(m => m.id));

  // Fallback / fill to 5 most recent by turn number
  const remaining = allCandidates
    .filter(m => !selectedIds.has(m.id))
    .sort((a, b) => (b.turn || 0) - (a.turn || 0));

  for (const item of remaining) {
    if (selected.length >= 5) break;
    selected.push(item);
  }

  return selected.slice(0, 5);
}
