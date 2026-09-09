# Master Build Prompt — PS4 Voice Memory Companion

Use this as the single prompt to hand to an AI code-gen tool (Claude Code, Cursor, etc.) to scaffold and build this project. It consolidates the goals, architecture, and implementation plan into one spec.

---

## Project Brief

Build a voice/text AI companion that visibly remembers relevant details about the user across a conversation session, using far less context per turn than naive full-transcript replay. Target: a working, demoable build in a 6-hour hackathon window, built by a 3-person team with basic/intermediate web dev skill and heavy reliance on AI code-gen tools.

**One-line pitch (the north star — every feature decision must serve this line):**
"Most assistants forget you the moment the session ends — this one remembers what matters, and does it using a fraction of the context."

---

## Hard Constraints (never violate these)

- **Exactly one external paid/rate-limited dependency**: a single LLM API, called twice per turn (one chat completion call, one extraction call). Everything else must be free and local.
- **No database.** In-memory array or a flat JSON file only — no SQLite, no graph DB, no vector DB.
- **No embeddings.** Retrieval is plain keyword/tag matching — deliberately simpler and more predictable than semantic search for a live demo.
- **No live OAuth** to Spotify, Instagram, or any real platform. Music/social data is a static hardcoded JSON fixture.
- **No persistence across sessions/restarts.** In-memory for the demo session is sufficient.
- **Never send full conversation history to the chat completion call.** Every chat call receives only: system prompt + top-5 retrieved memories + current user message. This rule is the entire architecture's efficiency claim — if it breaks anywhere, the demo's core claim breaks with it.
- **Every external API call must have a hardcoded fallback.** No silent hangs, no dead air, no crash on stage.
- **Never fabricate numbers.** The token efficiency comparison must use real, computed token counts — never illustrative or hardcoded values.
- **No multi-user, no auth, no accounts, no mobile responsiveness, no non-English support.**
- **Do not add features beyond what's listed in scope below without flagging it first.**

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Tailwind | Fast to scaffold, team-familiar |
| Voice I/O | Browser Web Speech API (`SpeechRecognition`, `speechSynthesis`) | Free, no external service, no auth |
| Chat + Extraction | One LLM API, two separate minimal-context calls | Single external dependency to manage |
| Storage | In-memory array / flat JSON file | Zero setup cost, sufficient for a session-length demo |
| Retrieval | Plain JS keyword/tag matching | Predictable, no extra API call or cost |
| Enrichment | Static hardcoded JSON fixture | Zero integration risk |
| Hosting | Local dev server | No deployment needed for a live demo |

---

## Architecture

### Component responsibilities (strict separation — do not blur these)

| Component | Owns | Does NOT own |
|---|---|---|
| Voice I/O | Converting audio ↔ text | Any chat, memory, or retrieval logic |
| Chatbot Core | Generating replies from message + top-5 memories | Storing memories, deciding relevance |
| Extraction Pipeline | Turning one message into structured JSON | UI display, retrieval logic |
| Memory Storage | Holding the flat, tagged memory list | Ranking or filtering memories |
| Retrieval Engine | Ranking/selecting top-5 memories per turn | Generating replies, storing new memories |
| Enrichment Layer | Supplying static fake profile data | Anything live or conversation-derived |
| Efficiency Module | Computing/reporting real token counts | Any conversational logic |
| UI / Memory Panel | Displaying state | Producing or modifying state |

### Turn-by-turn flow

1. User speaks or types a message.
2. Speech-to-Text converts to text (if voice).
3. Chat Engine asks Retrieval Engine for relevant memories.
4. Retrieval Engine scores stored memories (including enrichment entries) by tag/keyword overlap against the current message; returns top 5. If nothing scores above zero, return the 5 most recent by turn number.
5. Chat Engine generates a reply using **only**: system prompt + top-5 memories + current message.
6. Reply is spoken (Text-to-Speech) and/or displayed.
7. Separately, Extraction Pipeline receives **only the latest user message** and returns structured JSON (facts, preferences, mood).
8. Valid extraction results are stored in Memory Storage; malformed JSON is logged and skipped silently (no retry mid-demo).
9. Memory Panel and Efficiency Module update live from Memory Storage.

### Design principles

- **Minimal context, always** — this is the rule the entire efficiency claim depends on.
- **Decoupled layers** — voice, memory, enrichment, and display must each be removable live without breaking the others.
- **Predictable over sophisticated** — keyword matching over embeddings, on purpose.
- **Fail loud to the team, fail quiet to the audience** — fallbacks prevent visible failure; logs make failures visible to the team during testing.
- **Real numbers only** — no fabricated or illustrative efficiency stats.

---

## Data Model

**Memory object:**
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

**Chat call — context payload (never exceed this):**
```json
{
  "system_prompt": "string",
  "top_5_memories": ["memory content strings"],
  "current_message": "string"
}
```

**Enrichment fixture (`fakeProfile.json`):**
```json
{
  "top_artists": ["string"],
  "recent_listening_mood": "string",
  "recent_social_activity": ["string"]
}
```

---

## API Contracts

- **Chat completion call:** system prompt + up to 5 memory strings + current user message only. Never include prior turns verbatim.
- **Extraction call:** current user message only, prompted to return the JSON shape above and nothing else. On parse failure: log and skip, do not retry.
- **Retrieval:** score stored memories (including enrichment) by tag/keyword overlap with the current message; return top 5; fall back to 5 most recent by turn if no matches.

---

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

---

## Scope

**Build:**
- Text-based chat loop with a single LLM
- Browser-native voice input/output
- Memory extraction after each turn (facts, preferences, mood)
- Flat, tagged memory storage
- Keyword/tag-based top-5 retrieval
- Live token-count comparison (naive replay vs. actual context sent)
- Static fake music/social profile blended into retrieval
- A visible UI panel showing memory + efficiency numbers updating live

**Do not build:**
- Dual-layer knowledge graph
- Live OAuth to real Spotify/social APIs
- Formal relevance/accuracy benchmarking
- Any database beyond in-memory array or flat JSON file
- Voice cloning, multi-language support, or anything not listed above

---

## Build Order (execute phases in this sequence)

### Phase 1 — Chatbot Core
- Set up LLM API call, test with a single hardcoded prompt
- Minimal chat loop: text input → API call → text output, no memory or voice yet
- Add hardcoded fallback reply for API errors/timeouts
- Verify: 5 varied test messages get reasonable replies; fallback triggers when API key is deliberately broken

### Phase 2 — Voice I/O
- Wrap chat loop with `SpeechRecognition` for input
- Wrap chat loop with `speechSynthesis` for output
- Add manual text-input fallback alongside voice
- Verify: spoken input behaves identically to typed input; output is audibly spoken

### Phase 3 — Memory Extraction (write-only)
- Write extraction prompt template
- Call extraction after every chat turn, using only the latest message
- Store valid results in `memoryStore.js`; skip silently on malformed JSON
- Verify: 10+ sample messages, valid JSON for at least 8/10; bot behavior unchanged from Phase 2

### Phase 4 — Memory Retrieval (read side)
- Implement keyword/tag matching in `retrieval.js`
- Wire top-5 result into the chat call's context
- Add "most recent 5" fallback when no tag matches
- Verify: scripted conversation references an earlier fact correctly later on

### Phase 5 — Efficiency Comparison
- Implement naive token count (full history length)
- Implement actual token count (system + top-5 + message)
- Display both numbers together, updating every turn
- Verify: both numbers are real counts, gap grows as conversation continues

### Phase 6 — Enrichment Layer
- Write specific, non-generic fake profile data into `fakeProfile.json`
- Feed enrichment entries into retrieval as memory-like items
- Confirm this layer can be disabled without breaking the rest of the app
- Verify: a question related to the fake profile visibly reflects it in the reply

### Phase 7 — UI / Memory Panel
- Build live-updating memory list display
- Build live-updating efficiency comparison display
- Add manual refresh control as a fallback for lag
- Verify: full conversation runs, panel updates without page reload

### Phase 8 — Demo Script & Fallbacks
- Write and rehearse the exact scripted demo conversation
- Pre-load `fallbackMemories.json` at session start
- Agree the one-line honest answer about what was/wasn't formally benchmarked
- Verify: full scripted demo runs twice end-to-end without manual intervention

---

## Rules for the Agent (non-negotiable, apply throughout)

1. Never send full conversation history to the chat completion call — only current message + top-5 memories + system prompt.
2. Keep the extraction call and the chat call fully separate; both must be minimal-context.
3. Use keyword/tag matching for retrieval, not embeddings.
4. Every external API call must have a hardcoded fallback response — no silent hangs.
5. No live OAuth anywhere — music/social data is a static fixture only.
6. No database — in-memory array or flat JSON file only.
7. Do not add features beyond Scope without flagging it first.

---

## Definition of Done

- [ ] A user can have a voice or text conversation, start to finish, without crashes
- [ ] The companion correctly references at least one fact mentioned earlier in the same session, unprompted
- [ ] A visible panel shows extracted memories updating live as the conversation happens
- [ ] A visible counter shows real token counts: naive full-replay vs. actual context sent, with the gap visibly growing
- [ ] At least one response is visibly personalized using the fake music/social profile
- [ ] Every external API call has a working fallback preventing dead air on failure
- [ ] The team can recite, without hesitation, the one-line honest answer about what was and wasn't formally benchmarked

## Final Verification Plan

- [ ] Run the full scripted demo conversation end to end on the dev server
- [ ] Confirm the memory panel updates live after each turn
- [ ] Confirm the efficiency comparison shows real, increasing numbers
- [ ] Deliberately break the API key and confirm fallback responses trigger instead of a crash
- [ ] Confirm typed input and spoken input both work identically

## Priority Tiers (if time runs short)

- **P0 (never cut):** Chat core, memory extraction, memory retrieval, voice wrapper
- **P1 (cut only if forced):** Token efficiency comparison display, memory panel UI polish
- **P2 (cut first):** Music/social enrichment layer, visual polish beyond a clean functional layout

Cut top-down from P2 if the clock is tight at hour 4. Never cut a P0 item to save time on P1/P2.
