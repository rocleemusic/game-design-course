# Benchmark Plan — model weight vs output quality (the Giver)

The run plan for Task 1's pipeline proof. Two phases: a **benchmark** (which model tier does each slot actually need and how much does it cost?) then a **clean demo run** at the winning config. 
## Why this is the right test

The GDD already sets this as the target-acceptance bar (v5 §9.1, Deep-soul arc):

> Target acceptance: **Agent-generated lines pass the side-by-side distinctness read.**

A side-by-side read is exactly what a benchmark is. Running it with cost data attached answers the acceptance question *and* a real scope question: **Content is the largest slot (700K of the 2M crew budget)** — if a cheaper tier holds quality, the budget stretches several-fold, which changes how much content the slice can carry.

## Run method (decided)

| Phase | Method | Why |
|---|---|---|
| **1. Benchmark** | **Workflow** (requires Roc's explicit opt-in at run time) | Only clean way to get per-agent `model`/`effort` control, parallel arms, deterministic reproduction, and real token accounting (`budget.spent()`). |
| **2. Clean demo** | **In-session subagents** | Live human gate, conversational, legible to narrate for class. Runs at the config the benchmark picks. |

**Cost note:** per agent, Workflow and in-session cost about the same — a 5-arm benchmark costs 5 arms either way. Workflow is chosen for *control and measurement*, not price.

## Baseline model + effort assignment

The single source of truth for crew config. Rationale: stronger reasoning for orchestration and judgment, lower tiers for bounded/mechanical work (v5 §8.1).

| Agent | Model | Effort | Why |
|---|---|---|---|
| **Narrative Director** | Opus 5 | high | Synthesizing a corpus into World Truths is the judgment peak. `xhigh` for a brand-new arc. |
| **Orchestrator** | Opus 5 | high | Sequencing is light; flag-routing and conflict resolution are not. |
| **Narrative Architect** | Opus 5 | **xhigh** | The proof's core. Trait orthogonality + seed→payoff design is where thin reasoning yields one archetype in different hats. |
| **Content / Dialogue** | Fable 5 | **medium** | Deliberately not high — the register wants one clause, ≤40 words, weight preloaded. Extended reasoning over-explains, and `register.md` names that failure: *"a verbose line tagged quiet is a defect."* |
| **Consistency Verifier** | Sonnet 5 | high | Checklist work, but essence-vs-role is subtle wording judgment and the highest-stakes check. Small inputs, so high effort is cheap. |
| **QA / Playtest** | Haiku 4.5 | low | Mechanical graph enumeration. Nothing to deliberate. |

**Effort caveat:** per-agent effort only applies inside a Workflow. In-session subagents inherit session effort — for the demo run, set session effort `high` and counter Content's tendency to over-write with explicit terseness constraints in its prompt.

## The arms

One variable per set, targeting where the recommendation is a *guess* rather than a derivation.

### Arm set A — the budget lever (Narrative Architect)
**Question:** does the highest-judgment slot actually need Opus?

| Arm | Model | Effort |
|---|---|---|
| A1 | Opus 5 | xhigh |
| A2 | Sonnet 5 | xhigh |

Output per arm: the Giver's persona_card (behavior cluster, trait axes, conviction, notice_and_want) + one echo_template + delta/canon.

### Arm set B — the register question (Content / Dialogue)
**Question:** does a prose-tuned model help or hurt a deliberately anti-ornamental voice? Fable is tuned toward richness; our register wants the opposite ("cut before adding"). This is genuinely unknown.

| Arm | Model | Effort |
|---|---|---|
| B1 | Fable 5 | medium |
| B2 | Opus 5 | medium |
| B3 | Sonnet 5 | medium |

All three write from **the same approved persona card** (the winner of set A, or A1 if undecided), same scene context, same tone, same `max_words`.

**Total: 5 arms.**

## Controls

Held constant across arms within a set: the input bundle (Giver seed from §6.3 + `backstory_guideline` + the ratified arc doc), the role prompt verbatim, the schemas, the assigned tone, and `max_words`. Only the model varies within a set.

## Blind protocol

Roc reads the outputs **with model labels stripped**, ranks them, and states which he'd ship — *before* learning which arm was which. Knowing "this one is Opus" contaminates the judgment, and the acceptance bar is Roc's distinctness read.

## Metrics

1. **Roc's blind ranking** (the primary signal — the §9.1 acceptance bar is a human read).
2. **Consistency Verifier flag counts per arm** — an objective second signal. Run the Verifier over every arm at the same config (Sonnet 5 / high). Watch especially essence-vs-role and trait orthogonality: a cheaper model failing there is a hard disqualifier, not a taste difference.
3. **Tokens spent per arm** (`budget.spent()` deltas).

## How to read the result

- **Cheap tier wins or ties on the blind read AND has no invariant flags** → adopt it for that slot; recompute the budget.
- **Cheap tier is close but carries flags** → the flags decide. Invariant breaks are structural failures, not preferences.
- **Arms land close with no clear ranking** → **inconclusive, not equal.** One soul is n=1; record it as needing more samples rather than declaring parity.

## Then: the clean demo run

At the winning config, run the full stage-2 sequence in-session for the class: Narrative Architect → Content → Consistency Verifier → *(QA light)* → **Roc's gate**. Capture the call-down/signal-up trail as the run-log in this folder. That run is the game-40 deliverable and its output closes the §6.3 Giver stub.

### Token accounting for the demo run

**Yes, record it.** In-session subagents report usage on completion (`subagent_tokens`, `tool_uses`, `duration_ms`), so the run-log carries a per-agent token count without Workflow. Log one row per worker call.

This answers a **different and more useful question** than the benchmark. The benchmark asks *which model per slot*; the demo asks **what does one soul cost end-to-end through the full crew** — which is the number that drives scope:

| Derived figure | Why it matters |
|---|---|
| Tokens per soul (full crew, one pass) | The unit cost of the pipeline's output |
| × the 8-soul roster (3 deep + 5 texture) | Does the cast fit the **2M crew budget** (v5 §8)? |
| × expected revision passes (≤2 per `pipeline.md` step 13) | The realistic, not best-case, projection |

If the projection overruns 2M, the levers are the model config (from the benchmark), fewer deep souls, or lighter texture-soul treatment — all H14 scope-math decisions, now with real numbers instead of estimates.

**Three caveats, so the numbers aren't over-read:**
1. `subagent_tokens` is a per-agent total, not split input/output, and caching affects it — treat it as a comparative measure, not a dollar figure.
2. **The Orchestrator's own cost is invisible** in these counts (it's the main session's reasoning). The per-soul figure is therefore a floor, not a ceiling.
3. **Benchmark and demo accounting are not directly comparable** (Workflow's `budget.spent()` vs in-session `subagent_tokens` measure different things). Compare *within* a phase; treat cross-phase comparison as indicative only.

## Artifacts — where the results land

One folder per run, date-stamped, in `pipeline-runs/`:

```
pipeline-runs/
├── benchmark-plan.md              ← this plan
└── 2026-07-XX-giver/
    ├── arms/                      ← the 5 arm outputs, blind-labeled A1/A2/B1/B2/B3 (no model names)
    ├── RESULTS.md                 ← ★ the report to read
    ├── RESULTS.html               ← the class-facing render (design system below)
    ├── run-log.md                 ← the demo's call-down/signal-up trail (the game-40 evidence)
    └── giver-persona-card.md      ← the generated content, feeds §6.3
```

**Order matters — the blind protocol depends on it:**
1. Benchmark runs → `arms/` is written with **model identities withheld** (A1…B3 only).
2. Roc reads `arms/` and ranks. *Nothing revealing the models exists yet.*
3. **Then** `RESULTS.md` is written — with the reveal, the analysis, and the decision.

**`RESULTS.md` contains:**

| Section | What it answers |
|---|---|
| **Verdict** | The winning config per slot, and what changed because of it |
| **Benchmark table** | Arm × blind rank × Verifier flag count × tokens — with the model reveal |
| **Demo run summary** | Per-agent tokens, the end-to-end per-soul cost, and the 8-soul budget projection vs the 2M crew allocation |
| **Success criteria** | Did the crew produce an approvable Giver? Did the Arc-Question shape validate as a per-soul template? |
| **Follow-ups** | Spec updates to make, plus honest n=1 caveats where arms landed close |

### `RESULTS.html` — the class-facing render

`RESULTS.md` is the working report; **`RESULTS.html` is the submission render**, built on the **"Festival of Souls — GDD Pitch"** design system so the pipeline evidence matches the GDD it supports. (Precedent: `resources/pitch-review-board.html`, the gdd-review-kit `review-board.html`.)

**Design-system source of truth:** open-design project **`festival-of-souls-gdd`** ("Festival of Souls — GDD Pitch"), entry `index.html`. Re-pull with `get_file` if anything below drifts — the project is authoritative, this is a working extract.

**Tokens (verbatim):**
```css
:root{
  --cream:#F3EBD7; --cream-2:#ECE0C6; --cream-edge:#E4D5B4;
  --gold:#E3B26A; --amber:#CE8F45;
  --dusk:#6E8794; --dusk-deep:#435966;
  --teal:#2E4E48; --sage:#90A67C; --forest:#4E6B4F; --forest-deep:#33492F;
  --ink:#382C1E; --body:#251E15; --muted:#6E6149;
  --rule:#C9B996; --col:6.6in;
}
```

**Type:** one Google-Fonts import — `Fraunces` (display/headings/labels), `Spectral` (body prose, `Georgia` fallback), `IBM Plex Mono` (numerals/code). Body 14px/1.6.
```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');
```

**Signature treatments to carry:**
- **Aged-paper wash** — triple radial gradient over `--cream` (warm gold top-center, cool dusk bottom-left, sage top-right) + the `feTurbulence` grain overlay at `opacity:.5; mix-blend-mode:multiply`.
- **Panel recipe (universal)** — `border-radius:9px` + `1px solid var(--cream-edge)` + translucent near-white fill. **No shadows on panels** — flat, printed feel.
- **Section header** — a 30px circled `--forest` number beside an `.eyebrow` + title, over a `1.5px solid var(--rule)` bottom rule.
- **Eyebrow labels** — uppercase Fraunces with wide tracking (`.30em` eyebrow, `.34em` band title, `.22em` meta) in `--amber`.
- **Tables** — horizontal rules only, heavy `--forest` under the head, `--cream-edge` hairlines between rows, `rgba(236,224,198,.34)` zebra, and **amber IBM Plex Mono numerals** (`td.num`) — ideal for the token-count columns.
- **Logline bar** — `3px solid var(--gold)` left border on italic Fraunces, for the verdict callout.
- **Dark code block** — the one inverted surface (`linear-gradient(180deg,#2c3b38,#26332f)`, text `#e8dfc9`) — right for the typed JSON I/O in the run-log excerpts.
- **Tier chips** — `.q` dusk / `.w` sage / `.g` gold / `.s` gold→dusk gradient. Reusable for arm rankings.

**Adaptation note:** the system is **print-first** (fixed 8.5×11in sheets, inch rhythm, `print-color-adjust:exact`) and has **no dark mode** — a single cream theme. For a screen report, swap `--col:6.6in` for ~`44rem` and convert the inch spacing ladder to rem, keeping the ratios; retain the radii (`9px` panels), border weights (`1px` panels / `1.5px` structural / `3px` gold bar), and the shadow discipline.

## Success criteria (both phases)

1. The crew produces an approvable Giver end-to-end, honoring call-down/signal-up with the human gate at the output.
2. The **Arc-Question shape** validates as a per-soul template (*express each soul's X→Y spine as a "stay X or become Y?" question*). If it holds, promote it into `steering-layer.md` / `content-stages.md` stage 2.
3. A defensible model/effort config per slot, with token cost attached.

## Screenshots of the run

> This is an obsidian vault, if you have obsidian you can view the folder that way, or the pictures are in `assets/`

![[Pasted image 20260728000508.png]]
![[Pasted image 20260728000556.png]]