# Assignment #6 — GER Pipeline

**Roc Lee · game-project (working title: *Rebirth*)**
A cozy roguelite point-and-click adventure.

The loop inside my narrative pipeline. A writer generates the dialogue lines, a verifier checks it
against the guardrails, and a flagged line goes back for **at most two revisions** before a breaker
stops it. Every code box below is from the running harness.

# Whats in this repo

| file                            | description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `pipeline/src/generate.js`      | GENERATOR — one slot, sees only two card fields      |
| `pipeline/src/evaluate.js`      | EVALUATOR — deterministic layer, then judgment layer |
| `pipeline/src/breaker.js`       | CIRCUIT BREAKER — four trips                         |
| `pipeline/src/index.js`         | the loop that joins them                             |
| `pipeline/cards/`, `slots/`     | three souls, three prepared slots                    |
| `01-original_toby-the-shelf-C1` | original Toby Lines                                  |
| `02-current_toby-the-shelf-C1`  | GER Toby Lines                                       |
| `03-mara-set-for-two-C2`        | Mara lines for comparison                            |

## Pre-Build Declaration

**1. What content type does your game currently generate manually, inconsistently, or not at all?**

NPC dialogue. The pipeline writes dialogue thread per call, so every writer created content in isolation, blind to what the others wrote. The lines would come back choppy and disconnected.

**2. What specific rule from your GDD must every piece of that content satisfy?**

Guardrails check 6, voice register, and following personality an voice rules on each NPC definition card (persona card).

**3. What does a failure look like — concretely, in your game's terms?**

Two NPCs reading as the same person. Measured 2026-08-10: half of Ilsa's warm beats used *anticipation*, which is Toby's writing rule, not her *inclusion*. One pair was interchangeable. Or word count falling below or above a certain count. Or lines reading as disconnected or inventing props not defined in the content registry.

## What I built

A runnable Generator → Evaluator → Refiner → Circuit Breaker loop over one dialogue slot. The agent can run this as a check against its output.

```bash
cd pipeline && npm install && node src/index.js --slot all
```

It enforces one rule, named once in `config.js` so code, README and declaration cannot drift:

```js
export const ENFORCED_CHECK = {
  id: 6,
  name: 'Voice register',
  rule:
    "A soul's warmth must arrive by that soul's declared warmth_channel, and its " +
    'precision must run on its declared precision_profile — matching this soul’s ' +
    'card and no other’s. Warmth must be intact: flat is not cold.',
}
```

## What the Agent Does

**The generator never sees the checker's vocabulary.** A writer handed the words the verifier grades on writes to avoid flags instead of writing to sound like a person. `card.js` splits every card and hands out one half:

```js
return {
  npc_id: npcId,

  // Handed to the Generator. Exactly two fields.
  pinned: {
    essence_descriptor: card.pinned.essence_descriptor,
    voice_register: card.pinned.voice_register,
  },

  // Handed to the Evaluator only. What check 6 measures a line against.
  enforcement: {
    voice_enforcement: card.enforcement?.voice_enforcement ?? null,
    warmth_channel: card.enforcement?.warmth_channel ?? null,
    deflection_target: card.enforcement?.deflection_target ?? null,
    precision_profile: card.enforcement?.precision_profile ?? null,
  },
}
```


**The evaluator runs cheap first.** Layer 1 is free: word ceilings and the em-dash ban. Layer 2
costs a call, so it never sees a line layer 1 rejected. All four layer 1 outcomes:

```
{ verdict: "PASS",            words: 5 }
{ verdict: "PROSE_FLAG",      words: 15, reason: "15 words, over the player_line ceiling of 12…" }
{ verdict: "PROSE_FLAG",      words: 6,  reason: "Contains an em-dash. The tell-purge bans them…" }
{ verdict: "STRUCTURAL_FLAG", words: 1,  reason: "Unknown slot_type \"barklet\". The slot spec is wrong, not the line." }
```

Layer 2 gets the *other* souls' channels for contrast, because the defect that matters is a good line doing another soul's job. Ilsa's *inclusion* arriving as Toby's *anticipation* passes every mechanical test. **The verifier flags. It never rewrites.**

**The refiner is not a blind retry.** A rejected slot goes back with the reason and the rejected text, told to change one thing:

```js
flag
  ? [
      '## This is a revision',
      '',
      `Attempt ${revision} was rejected. Reason:`,
      '',
      flag.reason,
      '',
      flag.previous ? `The rejected line was: ${flag.previous}` : null,
      '',
      'Write a new line that fixes exactly this. Change nothing else about the beat.',
    ]
  : null
```

**The circuit breaker is twenty lines**, and it is where the two-revision cap lives:

```js
export function decide(result, revision) {
  if (result.verdict === VERDICT.PASS) return { action: 'ship' }

  if (result.verdict === VERDICT.STRUCTURAL_FLAG)
    return {
      action: 'stop',
      trip: TRIP.STRUCTURAL,
      reason:
        'Structural flag — re-wording cannot fix this. Routed up to the Architect as a ' +
        'new prepared input, not back to the generator.',
    }

  if (revision >= MAX_REVISIONS)
    return {
      action: 'stop',
      trip: TRIP.EXHAUSTED,
      reason: `${MAX_REVISIONS} revisions used and still flagged. Slot parked unshipped for the human gate.`,
    }

  return { action: 'refine' }
}
```

| Trip | When |
| --- | --- |
| `PREFLIGHT` | card-lint fails → dispatch blocked before a single token is spent |
| `STRUCTURAL` | re-wording cannot fix it → leaves the loop, routes up to the Architect |
| `EXHAUSTED` | 2 revisions used → slot parked unshipped for the human gate |
| `FALLBACK` | repeat failure → escalates the model rather than repeating an identical call |

**The structural exit is the part that matters.** A retry counter alone is not a breaker. The
question is not *how many times have I tried* but *is trying again capable of working*. The cap of 2 is my pipeline's own number, from `narrative-pipeline/agents/orchestrator.md`.

## Were you able to run this in your game?

Yes, i was generating 9 threads, each 4 conversations with about 26 lines in each conversation, and this helped me get 85% there on the lines rather than 30 or 40% so editing was less painful.

**Did it catch something I would have missed?** 
It checks NPC tone so that they are more distinct from each other.  Otherwise I will end up writing them to sound the same.

For examples, `01-original_toby-teh-shelf-C1.md` is before fixes, `02-current-_toby-the-shelf-C1` is after.  Below a comparison of Toby vs Mara lines:

# Toby
## `CH-T2-08-1` — first contact, counter mid-order, jar shelf in view

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `O-SC-T2-08-1` | object | matter_of_fact | **[action]** Behind the counter stands a shelf of jars. There's a ribbon on two of them. They look to be still sealed. Toby is rushing around the bakery. |  | — |
| `L-CH-T2-08-1-s` | dialogue | matter_of_fact | "Ovens are up. First bake comes off in a minute, so mind the counter as you pass it." |  | Opens on the room's business and hands the player a piece of it, which is how he greets anyone. |

### Option `-a` — asks about the shelf of jars *(spoken · sets `shelf_seen` · moves `toby-the-shelf`)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-1-a-p` | player_line | matter_of_fact | "What are all the jars?" (4 w) |  | — |
| `L-CH-T2-08-1-a-r1` | dialogue | quiet | Toby answers quickly as he rushes by: "Thank-yous." |  | Attention has turned on him, so the answer goes as short as it goes. He names the surface and nothing under it. |
| `L-CH-T2-08-1-a-r2` | dialogue | warm | "Kettle's been on the side a while. Pour yourself some tea, it's the good stuff." |  | The warmth arrives as a thing already waiting, worked out before the question, and he never says he put it there. |
| `L-CH-T2-08-1-a-r3` | dialogue | matter_of_fact | "Pass me the peel and I'll have the first trays out." |  | Gives the attention a job to land on instead of him, and the tempo comes straight back the moment the talk is work. |

### Option `-b` — steps in on the order at hand *(deed · Intimacy)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-1-b-act` | action | matter_of_fact | **[action]** [A bag of flour has tipped over on the ground. Pick it up.] |  | — |
| `L-CH-T2-08-1-b-r1` | dialogue | quiet | Toby comes over and says quietly, "Ah thank you, can you hold it steady?" |  | Being helped before he asked puts him on the receiving side; he stays inside the count, the shortest place to stand. |
| `L-CH-T2-08-1-b-r2` | dialogue | warm | Toby levels the flour and measures some out, "Your sleeves will be white. Roll them up and I'll wait for you." |  | Levels the favour by anticipating the next small trouble and holding the work still until it is handled. |

### Option `-c` — plain talk about the order *(spoken · records nothing)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-1-c-p` | player_line | matter_of_fact | "Early start for a bake this size." (7 w) |  | — |
| `L-CH-T2-08-1-c-r1` | dialogue | matter_of_fact | "Twelve for the Hallow house, it'll be out by noon." |  | The size of the job is converted into a schedule that is already solved, before anyone can worry about it aloud. |
| `L-CH-T2-08-1-c-r2` | dialogue | warm | "There's some space on the window sill, feel free to sit there." |  | Supplies a place to be, then makes it nobody's in particular so no thanks can attach to it. |

# Mara

## `CH-T2-13-3` — the ten: the doll with the re-stitched arm, and she gives it a name in passing *(three options)*

**Rule-19 build, per the content block:** fragment → `A-CH-T2-13-3-s` → shorter fragment carrying the name. The set-up is split `-s1` / `-s2` around the action slot (C1 node 5's precedent), and **the ten lands in the shortest fragment in the scene.** The marked run is a separate beat, one pick later.

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-13-3-s1` | dialogue | matter_of_fact | "Nearly the bottom of it now." | 6 | The sort nearly done; nothing announced, nothing framed. |
| `A-CH-T2-13-3-s` | action | matter_of_fact | **[action]** A cloth doll comes up out of the drawer. Mara turns its re-stitched arm to the light, and her hands go on with the sort. | 25 | — |
| `L-CH-T2-13-3-s2` | dialogue | matter_of_fact | "That was Adren's." | 3 | The name given in passing, the way she would name any owner; she does not stop for it and the sort does not pause. |

### Option `-a` — asks after the doll *(spoken · sets `provenance_heard` · opens the nested children)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-13-3-a-p` | player_line | matter_of_fact | "Tell me about the doll." | 5 | — |

### Option `-b` — takes the next thing she hands over, lets the name stand *(deed · Intimacy)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-13-3-b-act` | action | matter_of_fact | **[action]** [Take the next thing she hands over.] | 7 | — |
| `L-CH-T2-13-3-b-r1` | dialogue | matter_of_fact | "Top layer's light things only. Then it's the jars, and the morning's ours again." | 14 | The name stands and the sort goes on unchanged; she treats what she said as said. |

### Option `-c` — asks what else is going to the shelf *(spoken · Trust)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-13-3-c-p` | player_line | matter_of_fact | "What else goes up beside the jars?" | 7 | — |
| `L-CH-T2-13-3-c-r1` | dialogue | matter_of_fact | "The scale and the small weights, and the strainers once they're dry. Everything the tonic wants in one reach." | 19 | The ordinary business she offered, taken; she answers from inside the work, where she is. |

*Records per graph: `-a` sets `provenance_heard`; `-b` Intimacy; `-c` Trust. No response frames asking as the caring pick; the name is delivered on every walk.*

### Nested child 1 — `CH-T2-13-3-a-1` · the provenance run *(node 3 › option a › child 1)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `O-CH-T2-13-3-a-1-s` | object | matter_of_fact | **[action]** The mend on the doll's arm sits at the shoulder, close-stitched in waxed thread, a different thread from the rest of it. | 22 | — |
| `L-CH-T2-13-3-a-1-s` | dialogue | matter_of_fact | "That's older than the stall. Adren carried it every winter till she was eight or nine, and it went through the flood year in a coat pocket, which is why the dye's gone at the feet. It came to the drawer with her winter things, the spring after. The arm was mended nine years back, waxed thread, because the wool kept tearing at the shoulder. It holds." | 67 | `deflection_target` working: asked after the doll, she gives the object entirely — owner, survival, arrival, dated mend — exact about the thing at every step, and says nothing about herself or what keeping it costs. The conversation feels answered; she has said nothing about her. **MARKED LONG RUN.** |
