# Audio

Sonic identity, the leitmotif recognition mechanic, the GameplayTag → Wwise tag system, and the Audio-Tag Agent's I/O schema. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. Visual direction lives in [`09-art-direction.md`](09-art-direction.md) — this file covers the audio half of what an earlier draft called "Art & Audio Direction," plus the tag-implementation system that only audio currently uses.

## Sonic identity

Music inspired by Joe Hisaishi and the Studio Ghibli films. Ambience and items grounded in foley libraries and field recordings. Magic follows an anime style. UI is tactile, with fantasy flourishes where appropriate.

Sound is the strongest retrospective trigger a person has, which is why the audible essence-signature is the deepest recognition clue: **the deepest soul's leitmotif surfaces from the festival mix once you have noticed and matched a detail about them across lives** — the leitmotif is triggered by a detail the player *caught and connected*, never by an accrual counter ticking over — so you can recognize someone by their sound before you can name them.

**Guardrail:** don't wire the leitmotif to any counter. It triggers on a noticed-and-matched detail only — this is what keeps it a recognition mechanic instead of a progress bar.

Sounds are collectible objects that travel free like knowledge (see [`05-collectibles.md`](05-collectibles.md)): you can show one to a neighbor (the leitmotif probe), gift a recorded melody as a declaration, or use one as a spell component. You record deliberately, never knowing which sound will matter, and its significance lands later.

## The GameplayTag → Wwise system

One idea runs the whole game: a single, department-agnostic tag names each gameplay event, and a lookup table turns that tag into sound, text, and art at once. A strict file-system hierarchy and folder map provide self-documenting asset connections and help an LLM derive where assets live.

```
<Entity>.<Interaction>[.<Phase>]   →   Wwise event · dialogue key · animation/VFX   (per department, via the tag-to-asset library)
```

- **Naming rule:** tags are hierarchical, department-agnostic (no `Audio.` / `Text.` / `Art.` prefix), and extensible: new content adds new tags, never a new scheme or an enum edit.
- **Resolution rule:** every department reads the *same* tag through its own resolver column in the library. Adding a department means adding a column.
- **CI note:** a validation pass (WAAPI-backed) flags orphan tags (a tag with no mapping) and missing mappings — the same collision and orphan check the Audio-Tag Agent runs, promoted to a build check so the library cannot silently drift.

**Implementation detail.** Triggers are department-agnostic Unreal GameplayTags, resolved to Wwise events through a data-driven tag-to-asset library.

- **One tag is a game-wide gameplay-event key, with no department prefix.** Each event is a hierarchical, extensible GameplayTag: `<Entity>.<Interaction>[.<Phase>]`, for example `NPC.Chef.Show.React` and `NPC.Chef.Ask.React`. One tag names one event, game-wide. The hierarchy grows by adding tags as content grows: no fixed enum, no schema change.
- **A tag-to-asset library resolves each tag per department.** The same tag maps to a Wwise event (audio), a dialogue line or key (text), and an animation or VFX asset (art): one tag, N department resolutions, so a single gameplay event drives sound and text and art together. The library (an Unreal DataAsset / DataTable) is the single source of truth, unaffected by assets being moved or renamed.
- **Direct event targeting.** Gameplay fires the event by tag lookup; each department reads its own resolution. Wwise Switches, States, and RTPCs are reserved for genuine runtime variation only (material-based footsteps, intensity or time-of-day ramps).

The Show and Ask interactions carry distinct interaction names because an NPC reacting to a shown sound resolves to different audio and dialogue than a spoken probe.

**Middleware is Wwise** (locked): familiar, scriptable, and WAAPI is the natural home for library tooling and validation.

**Ownership.** The tag namespace is shared and game-wide. The Audio-Tag Agent (below) owns the audio resolution: it proposes compliant tags and maps and verifies each tag's Wwise-event entry, flagging collisions and orphan or missing audio mappings. It generates no audio and assigns no style or emotion. Text and art resolutions are owned by their own department passes, keyed off the same tags.

## The Audio-Tag Agent

Owns the audio-tag contract that makes the system above work. Takes new entities plus the current tag-to-asset library and produces a compliant Unreal GameplayTag per required audio trigger, mapped to a Wwise event, checking each proposed tag for collisions and orphan or missing mappings. Generates no audio and assigns no style or emotion: it names and verifies format only.

- *In:* `{ new_entities:[{ entity_id, entity_type:"npc|object|scene|spell" }], required_interactions:[…from the four verb families, see 03-core-loop.md…], existing_tag_library }`
- *Out:* `{ new_tags:[{ entity_id, gameplay_tag:"NPC.Chef.Show.React", wwise_event, collision_flag, orphan_flag }], library_delta, violations:[…] }`
- *When:* schema / pre-production, whenever new entities enter the slice. *Gate:* soft: the library delta is reviewed and auto-commits on no objection.

See [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md) for this agent's place in the full roster and token budget.
