# Implementation Plan — PS4 Voice Memory Companion

## Goal

Build a voice/text AI companion that extracts and stores facts/preferences/mood from conversation, retrieves only the top-5 most relevant memories per turn (never full history), visibly proves lower token usage than naive full-transcript replay, and blends in static fake music/social data for personalization. Target: working, demoable build in 6 hours.

## Scope

**In scope:**
- Text-based chat loop with a single LLM
- Browser-native voice input/output (no external voice service)
- Memory extraction after each turn (facts, preferences, mood)
- Flat, tagged memory storage (no graph)
- Keyword/tag-based retrieval of top-5 memories (no embeddings)
- Live token-count comparison (naive replay vs. actual context sent)
- Static hardcoded fake music/social profile blended into retrieval
- A visible UI panel showing memory + efficiency numbers updating live

**Out of scope (do not build):**
- Dual-layer knowledge graph
- Live OAuth to real Spotify/social APIs
- Formal relevance/accuracy benchmarking against naive retrieval
- Any database beyond an in-memory array or flat JSON file
- Voice cloning, multi-language support, or anything not listed above

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Tailwind |
| Voice I/O | Browser Web Speech API (`SpeechRecognition`, `speechSynthesis`) |
| Chat + Extraction | One LLM API — two separate calls per turn |
| Storage | In-memory array (or single JSON file) |
| Retrieval | Plain JS keyword/tag matching |
| Enrichment | Static hardcoded JSON fixture |
| Hosting | Local dev server only |

## Project Structure

```
/src
  /components
    ChatWindow.jsx
    MemoryPanel.jsx
    EfficiencyComparison.jsx
    VoiceControls.jsx
  /lib
    chatEngine.js         // calls LLM for replies
    extraction.js         // calls LLM for memory extraction
    memoryStore.js         // in-memory/JSON storage + query functions
    retrieval.js           // keyword/tag matching, top-5 selection
    enrichment.js          // fake music/social fixture
    tokenCounter.js         // naive vs actual token count logic
    fallbacks.js            // hardcoded canned responses + fallback memory set
  App.jsx
/fixtures
  fakeProfile.json          // fake music/social data
  fallbackMemories.json     // pre-seeded memory set
```

## Data Model

**Memory object** (stored in `memoryStore.js`):
```json
{
  "id": "string",
  "type": "fact | preference | mood",
  "content": "string",
  "tag": "school | work | family | mood | music | social | other",
  "turn": "number",
  "source": "conversation | enrichment"
}
```

**Extraction call — expected response shape:**
```json
{
  "facts": ["string"],
  "preferences": ["string"],
  "mood": "string or null"
}
```

**Chat call — context sent (never more than this):**
```json
{
  "system_prompt": "string",
  "top_5_memories": ["memory content strings"],
  "current_message": "string"
}
```

**Enrichment fixture (`fakeProfile.json`) — example shape:**
```json
{
  "top_artists": ["string"],
  "recent_listening_mood": "string",
  "recent_social_activity": ["string"]
}
```

## API Contracts

- **Chat completion call:** system prompt + up to 5 memory strings + current user message only. Never include prior turns verbatim.
- **Extraction call:** current user message only, prompted to return the JSON shape above, nothing else. If parsing fails, log and skip — do not retry mid-demo.
- **Retrieval:** given the current message, score stored memories (including enrichment entries) by tag/keyword overlap, return top 5. If none score above zero, return the 5 most recent by `turn`.

---

## Task Checklist

### Phase 1 — Chatbot Core
- [ ] Set up LLM API call, tested with a single hardcoded prompt
- [ ] Build minimal chat loop: text input → API call → text output, no memory or voice
- [ ] Add hardcoded fallback reply for API errors/timeouts
- **Verify:** send 5 varied test messages, confirm reasonable replies and confirm fallback triggers when API key is deliberately broken

### Phase 2 — Voice I/O
- [ ] Wrap chat loop with `SpeechRecognition` for input
- [ ] Wrap chat loop with `speechSynthesis` for output
- [ ] Add manual text-input fallback alongside voice
- **Verify:** confirm spoken input produces identical behavior to typed input; confirm output is audibly spoken

### Phase 3 — Memory Extraction (write-only)
- [ ] Write extraction prompt template
- [ ] Call extraction after every chat turn, using only the latest message
- [ ] Store valid results in `memoryStore.js`; skip silently on malformed JSON
- **Verify:** run 10+ sample messages through extraction, confirm valid JSON returned for at least 8/10; confirm bot behavior is still unchanged from Phase 2

### Phase 4 — Memory Retrieval (read side)
- [ ] Implement keyword/tag matching in `retrieval.js`
- [ ] Wire top-5 result into the chat call's context
- [ ] Add "most recent 5" fallback when no tag matches
- **Verify:** have a scripted conversation where an earlier fact is referenced later; confirm the reply reflects it

### Phase 5 — Efficiency Comparison
- [ ] Implement naive token count (full history length)
- [ ] Implement actual token count (system + top-5 + message)
- [ ] Display both numbers together, update every turn
- **Verify:** confirm both numbers are real counts (not hardcoded), and the gap grows as the conversation continues

### Phase 6 — Enrichment Layer
- [ ] Write specific, non-generic fake profile data into `fakeProfile.json`
- [ ] Feed enrichment entries into retrieval as memory-like items
- [ ] Confirm this layer can be disabled without breaking the rest of the app
- **Verify:** ask something related to the fake profile, confirm the reply visibly reflects it

### Phase 7 — UI / Memory Panel
- [ ] Build live-updating memory list display
- [ ] Build live-updating efficiency comparison display
- [ ] Add manual refresh control as a fallback for lag
- **Verify:** run a full conversation, confirm panel updates without requiring a page reload

### Phase 8 — Demo Script & Fallbacks
- [ ] Write and rehearse the exact scripted demo conversation
- [ ] Pre-load `fallbackMemories.json` at session start
- [ ] Confirm the one-line honest answer about benchmarking is agreed by the team
- **Verify:** run the full scripted demo twice end-to-end without manual intervention

---

## Rules for the Agent

- Never send full conversation history to the chat completion call — only current message + top-5 memories + system prompt.
- Keep the extraction call and the chat call fully separate; both must be minimal-context.
- Use keyword/tag matching for retrieval, not embeddings.
- Every external API call must have a hardcoded fallback response — no silent hangs.
- No live OAuth anywhere — music/social data is a static fixture only.
- No database — in-memory array or flat JSON file only.
- Do not add features beyond what's listed in Scope without flagging it first.

## Final Verification Plan

- [ ] Start the dev server and run the full scripted demo conversation end to end
- [ ] Confirm the memory panel updates live after each turn
- [ ] Confirm the efficiency comparison shows real, increasing numbers
- [ ] Deliberately break the API key and confirm fallback responses trigger instead of a crash
- [ ] Confirm typed input and spoken input both work identically
