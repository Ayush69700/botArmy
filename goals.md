# Goals — PS4 Voice Memory Companion

## Mission

Build a voice/text AI companion that visibly remembers relevant details about the user across a conversation — using far less context per turn than naive full-transcript replay — and demo it convincingly within a 6-hour build window.

## The One-Line Pitch

"Most assistants forget you the moment the session ends — this one remembers what matters, and does it using a fraction of the context."

Every scope decision should be checked against whether it still lets this line stay true. If a feature doesn't serve this line, it's a candidate to cut.

## Success Criteria (Definition of Done)

The build is considered done when all of the following are true:

- [ ] A user can have a voice or text conversation with the companion, start to finish, without crashes
- [ ] The companion correctly references at least one fact mentioned earlier in the same session, unprompted
- [ ] A visible panel shows extracted memories updating live as the conversation happens
- [ ] A visible counter shows real token counts: naive full-replay vs. actual context sent — and the gap is visibly growing by the end of the demo
- [ ] At least one response is visibly personalized using the fake music/social profile
- [ ] Every external API call has a working fallback that prevents dead air if the call fails live
- [ ] The team can recite, without hesitation, the one-line honest answer about what was and wasn't formally benchmarked

## Priority Tiers

**P0 — Must ship (the demo doesn't work without these):**
- Chat core (text in/out)
- Memory extraction (write side)
- Memory retrieval (read side)
- Voice wrapper

**P1 — Should ship (strengthens the pitch, not existence-critical):**
- Token efficiency comparison display
- Memory panel UI polish

**P2 — Cut first if time runs short:**
- Music/social enrichment layer
- Any visual polish beyond a clean, functional layout

If the clock is tight at hour 4, cut top-down from P2. Never cut a P0 item to save time on a P1 or P2 item.

## Non-Goals

Explicitly not part of this build — do not spend time on these even if they seem related:

- A real knowledge graph or graph database
- Live OAuth integration with Spotify, Instagram, or any real social platform
- A formal, statistically valid benchmark of retrieval relevance vs. naive replay
- Persistent storage across sessions/restarts (in-memory for the demo session is enough)
- Multi-user support, authentication, or accounts
- Support for languages beyond English
- Mobile responsiveness

## Constraints

- **Time:** 6-hour build window total, including integration and demo prep — not just coding time
- **Team:** 3 people, basic/intermediate web dev skill, conceptual (not deep) ML/AI understanding, heavy reliance on AI code-gen tools
- **Dependencies:** exactly one external paid/rate-limited dependency allowed (the LLM API) — everything else must be free and local
- **Reliability over sophistication:** a simpler mechanism that works live beats a more advanced one that might not
- **Honesty:** never claim a benchmark, accuracy number, or capability that wasn't actually built and tested
