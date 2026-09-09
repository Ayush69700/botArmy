import { getMemories, addMemory, addMemories, clearMemories } from './src/lib/memoryStore.js';
import { retrieveTop5Memories, extractKeywords, detectMessageTags } from './src/lib/retrieval.js';
import { countTokens, computeNaiveTokens, computeActualTokens, recordTurnEfficiency, clearEfficiencyHistory, getEfficiencyHistory } from './src/lib/tokenCounter.js';
import { getFallbackChatReply, getFallbackExtraction } from './src/lib/fallbacks.js';
import { generateChatReply, COMPANION_SYSTEM_PROMPT } from './src/lib/chatEngine.js';
import { extractAndStoreMemories } from './src/lib/extraction.js';
import { getEnrichmentMemories, isEnrichmentEnabled, setEnrichmentEnabled } from './src/lib/enrichment.js';
import fallbackMemoriesSeed from './fixtures/fallbackMemories.json' with { type: 'json' };

console.log("==========================================");
console.log("   PS4 VOICE MEMORY COMPANION TEST SUITE   ");
console.log("==========================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Test 1: Token Counting with Real BPE (Phase 5)
// -------------------------------------------------------------
console.log("--- TEST 1: Real Token Counter (No Fabrication) ---");
const testText = "Hello world, this is a real BPE token calculation test.";
const tokens = countTokens(testText);
assert(tokens > 0, `Real token count computed: "${testText}" = ${tokens} tokens`);

const naiveCount = computeNaiveTokens(
  COMPANION_SYSTEM_PROMPT,
  [
    { role: 'user', content: 'Turn 1 user message' },
    { role: 'assistant', content: 'Turn 1 assistant reply' },
    { role: 'user', content: 'Turn 2 user message' },
    { role: 'assistant', content: 'Turn 2 assistant reply' }
  ],
  "Turn 3 message"
);
const actualCount = computeActualTokens(
  COMPANION_SYSTEM_PROMPT,
  ["Memory 1 about Seattle", "Memory 2 about Matcha"],
  "Turn 3 message"
);
assert(naiveCount > actualCount, `Naive context (${naiveCount}) is larger than actual bounded context (${actualCount})`);

// -------------------------------------------------------------
// Test 2: Memory Storage (In-memory array)
// -------------------------------------------------------------
console.log("\n--- TEST 2: Memory Store Operations ---");
clearMemories();
assert(getMemories().length === 0, "Memory store starts empty after reset");

addMemory({
  type: 'fact',
  content: "User loves hiking in North Cascades",
  tag: 'social',
  turn: 1,
  source: 'conversation'
});
assert(getMemories().length === 1, "Added 1 memory item");
assert(getMemories()[0].content === "User loves hiking in North Cascades", "Memory content stored correctly");

addMemories(fallbackMemoriesSeed);
assert(getMemories().length === 6, `Pre-seeded fallback memories loaded: total = ${getMemories().length}`);

// -------------------------------------------------------------
// Test 3: Tag & Keyword Overlap Retrieval (Phase 4)
// -------------------------------------------------------------
console.log("\n--- TEST 3: Plain Keyword/Tag Retrieval Engine ---");
const musicRetrieval = retrieveTop5Memories("What music or artists should I put on right now?");
assert(musicRetrieval.length > 0, `Music query retrieved ${musicRetrieval.length} memories`);
const hasMusicMatch = musicRetrieval.some(m => m.tag === 'music' || /artist|music|fred/i.test(m.content));
assert(hasMusicMatch, "Music query successfully retrieved music-tagged memories");

const familyRetrieval = retrieveTop5Memories("How is my sister Maya doing with the Seattle move?");
assert(familyRetrieval.length > 0, `Family query retrieved ${familyRetrieval.length} memories`);
const hasMayaMatch = familyRetrieval.some(m => /maya|sister|seattle/i.test(m.content));
assert(hasMayaMatch, "Family query successfully matched Maya and Seattle facts");

const emptyOverlap = retrieveTop5Memories("xylophone zebra kaleidoscope quantum");
assert(emptyOverlap.length <= 5 && emptyOverlap.length > 0, "No keyword match falls back to most recent 5 items");

// -------------------------------------------------------------
// Test 4: Enrichment Layer & Decoupling (Phase 6)
// -------------------------------------------------------------
console.log("\n--- TEST 4: Enrichment Layer Decoupling ---");
setEnrichmentEnabled(true);
const enrichmentOn = getEnrichmentMemories();
assert(enrichmentOn.length > 0, `Enrichment active: returns ${enrichmentOn.length} items`);

setEnrichmentEnabled(false);
const enrichmentOff = getEnrichmentMemories();
assert(enrichmentOff.length === 0, "Enrichment can be disabled cleanly without breaking");
setEnrichmentEnabled(true); // Re-enable

// -------------------------------------------------------------
// Test 5: Fallback Chat & Extraction (Phase 1 & 8)
// -------------------------------------------------------------
console.log("\n--- TEST 5: Fallbacks and Broken API Key Handling ---");
const fallbackSister = getFallbackChatReply("Do you remember my sister Maya?", ["User's sister Maya is moving to Seattle"]);
assert(/maya|seattle/i.test(fallbackSister), `Sister fallback response relevant: "${fallbackSister}"`);

const fallbackMusic = getFallbackChatReply("Can you suggest some music?");
assert(/fred again|overmono|phoebe/i.test(fallbackMusic), `Music fallback response references fixture: "${fallbackMusic}"`);

// Broken key chat reply execution
const brokenKeyResult = await generateChatReply({
  userMessage: "What should I listen to?",
  top5Memories: retrieveTop5Memories("What should I listen to?"),
  apiConfig: { apiKey: 'broken-key-xyz', simulateFailure: true }
});
assert(brokenKeyResult.isFallback === true, "Deliberately broken API key safely triggers fallback reply");
assert(brokenKeyResult.reply.length > 0, "Fallback reply is non-empty");

// -------------------------------------------------------------
// Test 6: Memory Extraction (Phase 3)
// -------------------------------------------------------------
console.log("\n--- TEST 6: Memory Extraction Pipeline ---");
const sampleMessages = [
  "I am building a robotics capstone project for my university degree",
  "I love iced oat milk matchas with lavender syrup",
  "I'm feeling super exhausted from this 24-hour hackathon",
  "My older sister Maya is moving to Seattle",
  "I went bouldering at the climbing gym on Thursday evening",
  "I prefer dark mode UI designs over light mode",
  "I work as a junior frontend developer at an edtech startup",
  "I'm really excited about our demo presentation today",
  "My dog Buster loves playing fetch in the park",
  "I prefer drinking green tea instead of black coffee"
];

let validExtractions = 0;
for (const msg of sampleMessages) {
  const extracted = await extractAndStoreMemories({
    userMessage: msg,
    turn: 1,
    apiConfig: { apiKey: '', simulateFailure: true } // Tests deterministic fallback extractor
  });
  if (extracted && (extracted.facts.length > 0 || extracted.preferences.length > 0 || extracted.mood)) {
    validExtractions++;
  }
}
assert(validExtractions >= 8, `Extraction test: ${validExtractions}/10 messages extracted valid facts/preferences/mood (Goal: >= 8/10)`);

// -------------------------------------------------------------
// Test 7: Cumulative Turn Efficiency Trajectory (Phase 5)
// -------------------------------------------------------------
console.log("\n--- TEST 7: Turn-by-Turn Efficiency Metrics ---");
clearEfficiencyHistory();
let runningHistory = [];
for (let turn = 1; turn <= 5; turn++) {
  const userMsg = `Turn message ${turn}`;
  const record = recordTurnEfficiency({
    turn,
    systemPrompt: COMPANION_SYSTEM_PROMPT,
    fullHistory: runningHistory,
    top5Memories: ["Memory 1", "Memory 2", "Memory 3"],
    currentMessage: userMsg
  });
  runningHistory.push({ role: 'user', content: userMsg });
  runningHistory.push({ role: 'assistant', content: `Assistant reply ${turn}` });
}

const finalHistory = getEfficiencyHistory();
const firstTurn = finalHistory[0];
const lastTurn = finalHistory[finalHistory.length - 1];
assert(lastTurn.naiveTokens > firstTurn.naiveTokens, `Naive replay tokens grow with turns: Turn 1 (${firstTurn.naiveTokens}) -> Turn 5 (${lastTurn.naiveTokens})`);
assert(lastTurn.tokensSaved > firstTurn.tokensSaved, `Tokens saved gap widens: Turn 1 (+${firstTurn.tokensSaved}) -> Turn 5 (+${lastTurn.tokensSaved})`);
assert(lastTurn.cumulativeSaved > 0, `Cumulative tokens saved is positive: ${lastTurn.cumulativeSaved} tokens`);

console.log("\n==========================================");
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("==========================================");

if (failed > 0) {
  process.exit(1);
}
