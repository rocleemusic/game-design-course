# Assignment #6 — GER Pipeline

**Roc Lee · game-project (working title: *Rebirth*)**
A cozy roguelite point-and-click adventure, built with ink inside Unreal 5.8.

The loop inside my narrative pipeline. A writer generates one dialogue line, a verifier checks it
against one guardrail, and a flagged line goes back for **at most two revisions** before a breaker
stops it. Every code box below is from the running harness.

# Whats in this repo

| file | description |
| --- | --- |
| `pipeline/src/generate.js` | GENERATOR — one slot, sees only two card fields |
| `pipeline/src/evaluate.js` | EVALUATOR — deterministic layer, then judgment layer |
| `pipeline/src/breaker.js` | CIRCUIT BREAKER — four trips |
| `pipeline/src/index.js` | the loop that joins them |
| `pipeline/cards/`, `slots/` | three souls, three prepared slots |
| `STAGING.md` | the design pass |

## Pre-Build Declaration

**1. What content type does your game currently generate manually, inconsistently, or not at all?**

NPC dialogue. The pipeline writes one slot per call, so every writer solves a soul's signature move
in isolation, blind to what the others wrote. The lines come back choppy and disconnected.

**2. What specific rule from your GDD must every piece of that content satisfy?**

Guardrails check 6, voice register. Warmth has to arrive by the channel written on that soul's
persona card, and nobody else's.

**3. What does a failure look like — concretely, in your game's terms?**

Two neighbours reading as one person. Measured 2026-08-10: half of Ilsa's warm beats used
*anticipation*, which is Toby's channel, not her *inclusion*. One pair was interchangeable.
*"Stool's inside the door if you're stopping"* against *"Stool's under the counter if the standing
gets long."* Same object, same conditional tail, same job.

*(104 words.)*

## What I built

A runnable Generator → Evaluator → Refiner → Circuit Breaker loop over one dialogue slot. My
pipeline already had all four parts, but as markdown a human dispatched by hand. This is the loop
itself, unattended.

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

**The generator never sees the checker's vocabulary.** A writer handed the words the verifier grades
on writes to avoid flags instead of writing to sound like a person. `card.js` splits every card and
hands out one half:

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

A prompt can promise that split. Only a function keeps it.

**The evaluator runs cheap first.** Layer 1 is free: word ceilings and the em-dash ban. Layer 2
costs a call, so it never sees a line layer 1 rejected. All four layer 1 outcomes:

```
{ verdict: "PASS",            words: 5 }
{ verdict: "PROSE_FLAG",      words: 15, reason: "15 words, over the player_line ceiling of 12…" }
{ verdict: "PROSE_FLAG",      words: 6,  reason: "Contains an em-dash. The tell-purge bans them…" }
{ verdict: "STRUCTURAL_FLAG", words: 1,  reason: "Unknown slot_type \"barklet\". The slot spec is wrong, not the line." }
```

Layer 2 gets the *other* souls' channels for contrast, because the defect that matters is a good
line doing another soul's job. Ilsa's *inclusion* arriving as Toby's *anticipation* passes every
mechanical test. **The verifier flags. It never rewrites.**

**The refiner is not a blind retry.** A rejected slot goes back with the reason and the rejected
text, told to change one thing:

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
question is not *how many times have I tried* but *is trying again capable of working*. The cap of 2
is my pipeline's own number, from `narrative-pipeline/agents/orchestrator.md`.

## Were you able to run this in your game?

Yes, and the cards, ceilings and guardrail are the real ones, not written for this assignment.

**Did it catch something I would have missed?** In the Kinbound run from Assignment #4 the
Verifier noticed Ilsa's apron seed resembled Toby's channel, judged it a pass, and **carried the
observation up anyway**. Two weeks later that same defect was measured across the whole batch. It is
answer 3 of my declaration. In that run one slot also hit the two-revision cap, and revision plus
re-verification came to **52% of total run tokens**. That is the argument for a breaker.
Trail: [`assignment-04/2026-07-25-kinbound/run-log.md`](../assignment-04/2026-07-25-kinbound/run-log.md).

## Appendix

- `STAGING.md` — the design pass. `pipeline/README.md` — CLI, exit codes, offline mode.
- **`fixtures/` ships empty on purpose.** `--offline` errors until the harness runs online once. An
  empty fixture set should fail loudly. The before/after demonstration is Assignment #7.
- **Two files are copies**, each naming its source in its header: `src/ceilings.js` from
  `tools/line-lint.mjs`, `cards/*.json` from `cast/*.md`. Inlined so this folder runs standalone.
