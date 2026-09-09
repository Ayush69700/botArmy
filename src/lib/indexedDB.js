/**
 * Chromium Native IndexedDB Layer (PS4VoiceMemoryDB)
 * Client-side structured storage built directly into Chromium/Chrome/Edge.
 * Persists memories, conversation transcripts, and token efficiency metrics
 * across page refreshes, hard reloads, and browser restarts.
 */

const DB_NAME = 'PS4VoiceMemoryDB';
const DB_VERSION = 1;

let dbInstance = null;

function isIndexedDBAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

/**
 * Initializes and opens the IndexedDB database.
 */
export function openDatabase() {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('efficiency')) {
        db.createObjectStore('efficiency', { keyPath: 'turn' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('[IndexedDB] Failed to open database:', event.target.error);
      resolve(null);
    };
  });
}

/**
 * Retrieves all stored memories from IndexedDB.
 */
export async function getAllMemoriesFromDB() {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('memories', 'readonly');
      const store = tx.objectStore('memories');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Saves or updates a single memory in IndexedDB.
 */
export async function putMemoryInDB(memory) {
  const db = await openDatabase();
  if (!db || !memory) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('memories', 'readwrite');
      const store = tx.objectStore('memories');
      store.put(memory);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Saves multiple memories in IndexedDB.
 */
export async function putMemoriesInDB(memories = []) {
  const db = await openDatabase();
  if (!db || !Array.isArray(memories) || memories.length === 0) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('memories', 'readwrite');
      const store = tx.objectStore('memories');
      memories.forEach((m) => store.put(m));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Clears memories store.
 */
export async function clearMemoriesFromDB() {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('memories', 'readwrite');
      const store = tx.objectStore('memories');
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Retrieves conversation transcript messages from IndexedDB.
 */
export async function getAllMessagesFromDB() {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Appends a message to IndexedDB.
 */
export async function putMessageInDB(message) {
  const db = await openDatabase();
  if (!db || !message) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      store.add(message);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Clears conversation messages in IndexedDB.
 */
export async function clearMessagesFromDB() {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Retrieves efficiency metrics from IndexedDB.
 */
export async function getAllEfficiencyFromDB() {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('efficiency', 'readonly');
      const store = tx.objectStore('efficiency');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Saves an efficiency record in IndexedDB.
 */
export async function putEfficiencyInDB(record) {
  const db = await openDatabase();
  if (!db || !record) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('efficiency', 'readwrite');
      const store = tx.objectStore('efficiency');
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Clears all object stores across the database (full session reset).
 */
export async function clearAllDatabase() {
  await clearMemoriesFromDB();
  await clearMessagesFromDB();
  const db = await openDatabase();
  if (db) {
    try {
      const tx = db.transaction('efficiency', 'readwrite');
      tx.objectStore('efficiency').clear();
    } catch (e) {}
  }
}
