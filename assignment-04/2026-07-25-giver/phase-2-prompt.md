# Phase 2 — session prompt

Paste everything below the line into a **fresh session**. It is self-contained: the new session has none of the benchmark context. When the run is done, bring back the **Handback block** (last section) for synthesis.

---

## The task

You are running **Phase 2 of the game-project narrative-pipeline proof** — the clean demo run. This is the deliverable for game-40 and it closes the §6.3 Giver stub. It is also going in front of a class, so the transcript should stay legible.

Project root: `P:\GitHub\RL_MAP\RL_MAP\ProjectOS\game-project`

Read `CLAUDE.md` at the repo root first, then these, and nothing else unless the run requires it:

- `narrative-pipeline/pipeline.md` — the procedure
- `narrative-pipeline/agents/README.md` — the crew and the call-down/signal-up rules
- `narrative-pipeline/agents/narrative-architect.md`, `content-dialogue.md`, `consistency-verifier.md` — the three role prompts, binding
- `narrative-pipeline/arc-festival-slice.md` — the ratified arc doc (steering layer)
- `narrative-pipeline/register.md` — the voice contract
- `narrative-pipeline/guardrails.md` — the invariant checklist
- `narrative-pipeline/templates/persona-card-schema.md`, `echo-template-schema.md`
- `narrative-pipeline/examples/worked-example-mara.md` — the bar for concrete detail
- `pipeline-runs/2026-07-25-giver/RESULTS.md` — what Phase 1 established

**Phase 1 already ran.** A 5-arm benchmark picked the model config below and surfaced three defects that Phase 2 must fix. Do not re-run the benchmark.

## The config (decided by Phase 1 — do not re-litigate)

| Slot | Model | Effort | Note |
|---|---|---|---|
| **Narrative Architect** | **Opus 5** | session `high` | Won on trait orthogonality. Its one weakness was verbosity — apply the terseness constraint below. |
| **Content / Dialogue** | **Fable 5** | session `high` | Won the blind read 6-of-6. Prose-tuned turned out to *help* the flat register — cadence was the hard part, not restraint. |
| **Consistency Verifier** | **Sonnet 5** | session `high` | Unchanged. |

Per-agent effort only applies inside a Workflow. **Phase 2 runs in-session, so set session effort `high`** and counter Content's tendency to over-write with explicit terseness constraints in its prompt.

**Terseness constraint for the Architect:** cap `essence_descriptor`, `voice_register`, and `notice_and_want` at roughly 60 words each. Phase 1's winning card was structurally correct but bloated in exactly those three fields.

## The soul seed (locked — you may not invent beyond this)

```
npc_id: toby
name: Toby
essence hint (GDD v5 §6.3, locked): Belonging is earned by being needed. Manufactures
  indispensability, over-gives, cannot receive — sees the whole web of connection between
  people yet will not be a receiver in it.
conviction (locked): Cannot be a burden. Refuses care he has not earned; must be useful
  to be worth keeping.
recognition hook (locked): Always the one who sees how people connect.
arc (locked): can't receive -> can. Being claimed unearned frees him; the player's
  "I see you" is the corrective.
suit_tag: giving
role_tag this life: Baker. The role's festival goal is the communal feast.
backstory_guideline (from Roc): Grew up in a large family where no one ever had enough
  attention to go around, but learned that by being useful and taking care of other
  people's needs he would be praised and noticed.
```

**voice_register — pass this as a SPREAD, not a switch.** Phase 1 passed "animated, not monotone" as a binary and both arms missed the target. On a monotone↔animated scale Toby sits at roughly **70% animated**:

- The animation is a *trained skill*, not a temperament — it is the thing that worked in a crowded household. It runs fastest when he is most in debt.
- It shows as **tempo and uptake** — fast to answer, quick to offer, questions pointed outward — and **never as word count**. The one-clause preference and the 40-word ceiling bind absolutely. A verbose line tagged quiet is a defect.
- **The asymmetry:** animated when attention points outward; goes flat and short when attention turns back on him. A Toby line that stays animated while *receiving* care is a defect. *(Phase 1 deliberately withheld this to test whether the Architect would derive it. That test is over — it is now part of the seed, because Phase 2 is the deliverable. Roc can strike it if he'd rather see it re-derived.)*
- Held distinct from **the Content Server**, who hums while working and is genuinely at peace being needed. Same warmth on the surface, opposite engine underneath.

## Scene context

```
scene_id: bakery-feast-dough
location: Toby's bakery kitchen
time_of_day: morning
festival cycle: festival week
world_state: The communal feast is Toby's role-goal. The mishap in play, from the arc
  doc's per-occupation table: the feast dough went flat — not enough for the turnout.
  The arc doc marks this row as the receive-beat: the verb hook is Collect/Converse and
  Toby must accept help. The player is present in the kitchen.
tone: matter_of_fact (fixed for the scene)
max_words: 40
```

## Three fixes Phase 1 requires

1. **The voice_register spread** — above. Phase 1's seed was a binary and both arms missed it.
2. **Re-cut the stool echo seed.** Phase 1's Architect seeded the echo as *Toby drags a stool to the flour table, then puts it back and works standing.* Two independent Verifier passes flagged it: refusing a seat reads as ordinary baker practicality, so **the role explains away the essence it was meant to seed.** The replacement seed must be something no baker would do by default — the behavior has to be legible as *his*, not as *the job's*, to a player who never returns to the scene.
3. **Inline the spec bundle.** Do **not** hand each worker a list of files to Read. Assemble the content into the prompt yourself and hand it down. Phase 1 measured that each agent's per-turn cache re-billing turned a 54K job into 414K of billed volume; inlining collapses 6–8 tool turns into one. This is a real part of the experiment — see the token capture below.

   **Do not expect cross-agent cache sharing, and do not design for it.** It was tested directly and ruled out: agents with byte-identical preambles got exactly the same cache hit as a control with reordered content, because cache breakpoints sit at the system/tools boundary and everything we write lands past them. The ~20K harness prefix is already shared automatically and costs us nothing. **Every saving must come from fewer turns inside one agent, or from fewer agent calls.** Each worker starting cold is the floor, not a defect to engineer around.

## How to run it

Follow `pipeline.md` and the call-down/signal-up rules. You are the **Orchestrator**: you sequence, you prepare each input bundle, you route flags, you generate nothing yourself.

**Stage-2 sequence:** Narrative Architect → Content → Consistency Verifier → *(QA light)* → **Roc's gate.**

Hard rules:
- Workers never call each other. Every worker gets a prepared input and returns typed output.
- Flags route **up** to you, never sideways. Prose flag → back to Content, max 2 revisions. Structural flag → back to the Architect as new input.
- **The human gate is real.** Stop and put the output in front of Roc. Do not self-approve, and do not continue past the gate without him.
- Narrate each hand-off briefly as you go — this transcript is being shown to a class.

## What to capture

Write these into `pipeline-runs/2026-07-25-giver/`:

- **`run-log.md`** — the call-down/signal-up trail: for each worker call, the prepared input (summarized), the typed output, any flags, and the gated line. This is the game-40 evidence that the architecture ran as specified.
- **`giver-persona-card.md`** — the approved card + echo(s). This closes the §6.3 Giver stub and feeds Task 2.

**Token capture — three measures, never mixed.** Phase 1 got this wrong once; don't repeat it.

| Measure | Where it comes from |
|---|---|
| **Output** | tokens the agent generated |
| **Footprint** | the agent's final context size — what the progress panel shows and what `subagent_tokens` reports |
| **Billed volume** | per-call usage summed across the agent's loop; every turn re-bills the cached prefix |

Phase 1 reference, per soul at this config: **224,508 footprint / 1,089,969 billed.** If inlining works, Phase 2's billed figure should come in far below that. Report the delta.

---

## Handback block — paste this back for synthesis

Produce this at the end, as a single block:

```
PHASE 2 HANDBACK

1. CONFIG RUN — models/effort actually used per slot, and whether inlining was applied.
2. THE APPROVED CARD — final persona_card + echo_template(s) as approved at the gate.
3. THE LINES — final content lines with speaker_intent.
4. VERIFIER — flag count, each flag_type + reason, and what was done about it.
5. REVISIONS — how many prose revisions, how many structural round-trips to the Architect.
6. TOKENS — per agent: output / footprint / billed volume. Plus per-soul totals and the
   delta against Phase 1's 224,508 footprint / 1,089,969 billed.
7. ROC'S GATE — what he approved, what he changed, what he rejected and why.
8. THE THREE FIXES — did the 70/30 register land? Did the re-cut stool seed survive the
   Verifier? Did inlining reduce billed volume, and by how much?
9. OPEN — anything unresolved, and anything that should change in the specs.
```
