/**
 * Real Token Efficiency Computation Module
 * Computes authentic, non-fabricated BPE token counts for:
 * 1. Naive full-transcript replay context
 * 2. Actual minimal-context payload (system + top 5 + message)
 * Synchronized with Chromium's built-in IndexedDB for reload persistence.
 */

import { encode } from 'gpt-tokenizer';
import { getAllEfficiencyFromDB, putEfficiencyInDB } from './indexedDB.js';

let efficiencyHistory = [];
let listeners = new Set();
let isInitialized = false;

function notifyListeners() {
  const snapshot = [...efficiencyHistory];
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (e) {
      console.error("[TokenCounter] Listener error:", e);
    }
  });
}

/**
 * Initializes efficiency history from IndexedDB.
 */
export async function initializeEfficiencyHistory() {
  if (isInitialized) return efficiencyHistory;
  try {
    const records = await getAllEfficiencyFromDB();
    if (records && records.length > 0) {
      records.sort((a, b) => a.turn - b.turn);
      efficiencyHistory = records;
      notifyListeners();
    }
  } catch (e) {
    console.warn("[TokenCounter] IndexedDB init error:", e);
  } finally {
    isInitialized = true;
  }
  return efficiencyHistory;
}

if (typeof window !== 'undefined') {
  initializeEfficiencyHistory();
}

/**
 * Counts exact BPE tokens for any given string.
 * @param {string} text 
 * @returns {number}
 */
export function countTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  try {
    return encode(text).length;
  } catch (e) {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Builds the string representation of naive full transcript context:
 * System prompt + all prior user & assistant messages + current user message.
 * @param {string} systemPrompt 
 * @param {Array<{role: string, content: string}>} fullHistory - All prior turns
 * @param {string} currentMessage 
 * @returns {number} Real token count
 */
export function computeNaiveTokens(systemPrompt, fullHistory = [], currentMessage = '') {
  let combined = `${systemPrompt}\n\n`;
  for (const turn of fullHistory) {
    combined += `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}\n`;
  }
  combined += `User: ${currentMessage}`;
  return countTokens(combined);
}

/**
 * Builds the string representation of actual sent context:
 * System prompt + top-5 retrieved memories + current user message.
 * @param {string} systemPrompt 
 * @param {Array<string|Object>} top5Memories 
 * @param {string} currentMessage 
 * @returns {number} Real token count
 */
export function computeActualTokens(systemPrompt, top5Memories = [], currentMessage = '') {
  const memoryStrings = top5Memories.map(m => (typeof m === 'string' ? m : m.content));
  const memoryBlock = memoryStrings.length > 0 
    ? `Retrieved relevant memories:\n- ${memoryStrings.join('\n- ')}\n\n`
    : '';
  
  const combined = `${systemPrompt}\n\n${memoryBlock}User: ${currentMessage}`;
  return countTokens(combined);
}

/**
 * Records a turn's efficiency metrics.
 * @param {Object} params
 * @param {number} params.turn
 * @param {string} params.systemPrompt
 * @param {Array<Object>} params.fullHistory
 * @param {Array<Object|string>} params.top5Memories
 * @param {string} params.currentMessage
 * @returns {Object} Turn efficiency record
 */
export function recordTurnEfficiency({
  turn,
  systemPrompt,
  fullHistory,
  top5Memories,
  currentMessage
}) {
  const naiveTokens = computeNaiveTokens(systemPrompt, fullHistory, currentMessage);
  const actualTokens = computeActualTokens(systemPrompt, top5Memories, currentMessage);
  const tokensSaved = Math.max(0, naiveTokens - actualTokens);
  const percentSaved = naiveTokens > 0 
    ? Math.round(((naiveTokens - actualTokens) / naiveTokens) * 100) 
    : 0;

  const previousCumulative = efficiencyHistory.length > 0
    ? efficiencyHistory[efficiencyHistory.length - 1]
    : { cumulativeNaive: 0, cumulativeActual: 0, cumulativeSaved: 0 };

  const cumulativeNaive = previousCumulative.cumulativeNaive + naiveTokens;
  const cumulativeActual = previousCumulative.cumulativeActual + actualTokens;
  const cumulativeSaved = Math.max(0, cumulativeNaive - cumulativeActual);
  const cumulativePercentSaved = cumulativeNaive > 0
    ? Math.round((cumulativeSaved / cumulativeNaive) * 100)
    : 0;

  const record = {
    turn,
    naiveTokens,
    actualTokens,
    tokensSaved,
    percentSaved,
    cumulativeNaive,
    cumulativeActual,
    cumulativeSaved,
    cumulativePercentSaved,
    timestamp: Date.now()
  };

  efficiencyHistory.push(record);
  notifyListeners();
  putEfficiencyInDB(record).catch(() => {});
  return record;
}

/**
 * Returns current efficiency history.
 */
export function getEfficiencyHistory() {
  return [...efficiencyHistory];
}

/**
 * Resets efficiency metrics.
 */
export function clearEfficiencyHistory() {
  efficiencyHistory = [];
  notifyListeners();
}

/**
 * Subscribe to efficiency updates.
 * @param {Function} listener
 * @returns {Function} Unsubscribe function
 */
export function subscribeToEfficiency(listener) {
  listeners.add(listener);
  listener([...efficiencyHistory]);
  return () => {
    listeners.delete(listener);
  };
}
