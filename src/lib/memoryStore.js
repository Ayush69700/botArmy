/**
 * Memory Storage Layer (Synchronous LocalStorage + Chromium IndexedDB)
 * Flat, tagged memory list adhering strictly to the spec.
 * Instant zero-latency hydration from LocalStorage + Chromium IndexedDB persistence.
 */

import {
  getAllMemoriesFromDB,
  putMemoryInDB,
  putMemoriesInDB,
  clearMemoriesFromDB
} from './indexedDB.js';

const STORAGE_KEY = 'ps4_companion_memories_v2';

// 1. Synchronously initialize from localStorage to eliminate any async blank flash on reload
let memoryStore = [];
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        memoryStore = parsed;
      }
    }
  }
} catch (e) {
  console.warn("[MemoryStore] LocalStorage read error:", e);
}

let listeners = new Set();
let isInitialized = false;

function syncToLocalStorage(data) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.warn("[MemoryStore] LocalStorage write error:", e);
  }
}

function notifyListeners() {
  const snapshot = [...memoryStore];
  syncToLocalStorage(snapshot);
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (e) {
      console.error("[MemoryStore] Listener error:", e);
    }
  });
}

/**
 * Loads memories from IndexedDB on startup and merges with localStorage.
 */
export async function initializeMemoryStore() {
  if (isInitialized) return memoryStore;
  try {
    const dbMemories = await getAllMemoriesFromDB();
    if (dbMemories && dbMemories.length > 0) {
      // Merge unique memories by ID
      const existingIds = new Set(memoryStore.map(m => m.id));
      let added = false;
      dbMemories.forEach(m => {
        if (!existingIds.has(m.id)) {
          memoryStore.push(m);
          added = true;
        }
      });
      if (added) {
        notifyListeners();
      }
    } else if (memoryStore.length > 0) {
      // Save existing localStorage memories into IndexedDB
      putMemoriesInDB(memoryStore).catch(() => {});
    }
  } catch (e) {
    console.warn("[MemoryStore] IndexedDB sync error:", e);
  } finally {
    isInitialized = true;
  }
  return memoryStore;
}

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
 * Adds a single memory item to memory, localStorage, and IndexedDB.
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
    // Persist to IndexedDB
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
 * Resets or clears the memory store in RAM, localStorage, and IndexedDB.
 */
export function clearMemories() {
  memoryStore = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {}
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
