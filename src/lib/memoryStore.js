/**
 * Memory Storage Layer (In-Memory Array + Chromium Native IndexedDB Persistence)
 * Flat, tagged memory list adhering strictly to the spec.
 * Automatically synchronizes with Chromium's built-in IndexedDB so memories
 * persist across page reloads and browser restarts.
 */

import {
  getAllMemoriesFromDB,
  putMemoryInDB,
  putMemoriesInDB,
  clearMemoriesFromDB
} from './indexedDB.js';

let memoryStore = [];
let listeners = new Set();
let isInitialized = false;

function notifyListeners() {
  const snapshot = [...memoryStore];
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (e) {
      console.error("[MemoryStore] Listener error:", e);
    }
  });
}

/**
 * Loads memories from IndexedDB on startup.
 */
export async function initializeMemoryStore() {
  if (isInitialized) return memoryStore;
  try {
    const dbMemories = await getAllMemoriesFromDB();
    if (dbMemories && dbMemories.length > 0) {
      memoryStore = dbMemories;
      notifyListeners();
    }
  } catch (e) {
    console.warn("[MemoryStore] Could not load from IndexedDB, using memory array:", e);
  } finally {
    isInitialized = true;
  }
  return memoryStore;
}

// Auto-trigger initialization in browser environments
if (typeof window !== 'undefined') {
  initializeMemoryStore();
}

/**
 * Returns a shallow copy of all stored memories.
 */
export function getMemories() {
  return [...memoryStore];
}

/**
 * Adds a single memory item to the in-memory array and IndexedDB.
 * @param {Object} item - { type, content, tag, turn, source }
 * @returns {Object} Stored memory object with ID
 */
export function addMemory(item) {
  if (!item || !item.content) return null;

  const memory = {
    id: item.id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: item.type || 'fact',
    content: String(item.content).trim(),
    tag: item.tag || 'other',
    turn: typeof item.turn === 'number' ? item.turn : 0,
    source: item.source || 'conversation'
  };

  // Avoid identical duplicate entries
  const exists = memoryStore.some(
    (m) => m.content.toLowerCase() === memory.content.toLowerCase() && m.source === memory.source
  );

  if (!exists) {
    memoryStore.push(memory);
    notifyListeners();
    // Persist to Chromium IndexedDB
    putMemoryInDB(memory).catch(() => {});
  }

  return memory;
}

/**
 * Adds multiple memories.
 * @param {Array<Object>} items
 */
export function addMemories(items = []) {
  if (!Array.isArray(items)) return;
  const newItems = [];
  items.forEach((item) => {
    const mem = addMemory(item);
    if (mem) newItems.push(mem);
  });
  if (newItems.length > 0) {
    putMemoriesInDB(newItems).catch(() => {});
  }
}

/**
 * Resets or clears the memory store in RAM and IndexedDB.
 */
export function clearMemories() {
  memoryStore = [];
  notifyListeners();
  clearMemoriesFromDB().catch(() => {});
}

/**
 * Replaces or seeds memories with a predefined array.
 * @param {Array<Object>} items
 */
export function seedMemories(items = []) {
  memoryStore = [...items];
  notifyListeners();
  putMemoriesInDB(items).catch(() => {});
}

/**
 * Subscribe to memory store changes.
 * @param {Function} listener
 * @returns {Function} Unsubscribe function
 */
export function subscribeToMemories(listener) {
  listeners.add(listener);
  listener([...memoryStore]);
  return () => {
    listeners.delete(listener);
  };
}
