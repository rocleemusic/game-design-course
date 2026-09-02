# Dialogue Inventory — the tracking table

Every authored dialogue entry the T15/T16 rework calls for, one row each, so fill
status is visible at a glance. **This table tracks; the rulings rule.** Scope
comes from [`../plans/2026-08-23-npc-dialogue-rework-ruling.md`](../plans/2026-08-23-npc-dialogue-rework-ruling.md)
and [`../plans/2026-08-23-intro-story-ruling.md`](../plans/2026-08-23-intro-story-ruling.md),
steering from [`00-world-bible.md`](00-world-bible.md) (its consumer map names
which section feeds which entry type).

**Scope adjustments ruled 2026-08-23 (Roc), amending T15:**
- Greetings ×3 bond levels for the **deep three only**. Texture NPCs get **1
  authored greeting each**; the runtime LLM generates their variants.
- Spell-intro beats only for spells **available in game** — the 16 approved in
  [`../content/magic/_index.md`](../content/magic/_index.md). Rejected spells get nothing.
- Festival-night scenes for the **deep three only**.
- **Stretch, after all of the above are approved:** concise essence-reveal
  scenes per soul — what the thread registries do today, shorter.

**Statuses:** `—` not started · `drafted` · `gated` (Roc-approved) · `built` (in ink).
**Amended 2026-08-25 (Roc):** Mara is no longer the hand-written exemplar. The
ICM local-model test output was judged good enough to trust — all 40 rows,
Mara included, generate through the pipeline the same way. Superseded, not
struck: this is why every row below reads `Local model` and the roll-up no
longer splits by authorship.

**Generation model, all rows (set 2026-08-25 from local-model testing —
`../pipeline-runs/2026-08-17-register-loosening/2026-08-24-local-model-findings.md`,
`../assignments/assignment-8-icm/_kobold-tests/round2-findings.md`):**
`gemma4-26b-fiction-bf16` (MoE, Q4_K_M, `--moecpu 999`) primary, `Gemma-The-Writer-Mighty-Sword-9B`
Q6_K second choice — both clean on every canon/hard-limit test across both
rounds. Any other local model needs Q5_K_M minimum before trusting its output.

**Universal generation guards, every row:** never "remember/memory/forget"
describing how a spell, the festival, or an object works (`../narrative-pipeline/guardrails.md`
check 7); never invent backstory for a named-but-unexplained figure beyond
what the card states; never output a card's sample line verbatim or
near-verbatim (`../narrative-pipeline/templates/persona-card-schema.md`,
"Sample-line and invention safety"). Spell beats are the highest-risk
category — always generate with the spell's actual component table in
context, not just its name; half of round 2's canon failures traced to a
missing table, not a model problem.

**Spell beats key to the ROLE**, not the soul — spells attach to roles and the
role-soul deal re-shuffles each life (`content/magic/_index.md`). The soul named
is this life's holder, for writing convenience only.

## Intro (T16)

| ID | Entry | Steering | Method | Status |
|---|---|---|---|---|
| INT-1 | Intro VN scene — arrival, why the mage came, festival stakes, name entry | Bible: Festival of Souls · Hearthlight · The mage | Local model — Muse-12B, split into 2 bounded calls (arrival+stakes, then greeting+name); one long call loses at least one beat, per `2026-08-24-local-model-findings.md` §8 | — |

## Greetings — deep three (×3 bond levels each)

Bond levels per T9 (talk count, max 5): **first-meeting (0) · familiar (1–3) · close (4–5)**.

| ID | Soul | Level | Method | Status |
|---|---|---|---|---|
| GRT-toby-1 | Toby | first-meeting | Local model | — |
| GRT-toby-2 | Toby | familiar | Local model | — |
| GRT-toby-3 | Toby | close | Local model | — |
| GRT-ilsa-1 | Ilsa | first-meeting | Local model | — |
| GRT-ilsa-2 | Ilsa | familiar | Local model | — |
| GRT-ilsa-3 | Ilsa | close | Local model | — |
| GRT-mara-1 | Mara | first-meeting | Local model | — |
| GRT-mara-2 | Mara | familiar | Local model | — |
| GRT-mara-3 | Mara | close | Local model | — |

## Greetings — texture five (×2 rows each: first-meeting + generic)

**Scope amended 2026-08-25 (Roc, this session) — supersedes the 2026-08-23 "1
authored greeting each, runtime LLM generates variants" note.** Each texture
soul now gets a first-meeting greeting and a generic ("already met") greeting
— 2 rows each, 10 total, up from the prior 1-row (runtime-varies) design.

| ID | Soul | Level | Method | Status |
|---|---|---|---|---|
| GRT-linnet-first | Linnet | first-meeting | Local model | — |
| GRT-linnet-generic | Linnet | generic (already met) | Local model | — |
| GRT-nell-first | Nell | first-meeting | Local model | — |
| GRT-nell-generic | Nell | generic (already met) | Local model | — |
| GRT-juno-first | Juno | first-meeting | Local model | — |
| GRT-juno-generic | Juno | generic (already met) | Local model | — |
| GRT-pip-first | Pip | first-meeting | Local model | — |
| GRT-pip-generic | Pip | generic (already met) | Local model | — |
| GRT-bex-first | Bex | first-meeting | Local model | — |
| GRT-bex-generic | Bex | generic (already met) | Local model | — |

## Festival-goal encounters — deep three (×3 each)

Player helps toward the soul's festival goal by lending a hand or casting a
spell. Steering: bible's Festival of Souls + The festival week + the soul's card
and threads file.

| ID | Soul | Goal (this life) | Encounter | Method | Status |
|---|---|---|---|---|---|
| ENC-toby-1 | Toby | Baker — the communal feast | 1 | Local model | — |
| ENC-toby-2 | Toby | " | 2 | Local model | — |
| ENC-toby-3 | Toby | " | 3 | Local model | — |
| ENC-ilsa-1 | Ilsa | Blacksmith — the Arch centerpiece | 1 | Local model | — |
| ENC-ilsa-2 | Ilsa | " | 2 | Local model | — |
| ENC-ilsa-3 | Ilsa | " | 3 | Local model | — |
| ENC-mara-1 | Mara | Herbalist — the health tonic | 1 | Local model | — |
| ENC-mara-2 | Mara | " | 2 | Local model | — |
| ENC-mara-3 | Mara | " | 3 | Local model | — |

## Spell-intro story beats — 13 role spells

One beat per approved role spell: introduces it, gives clues on how to cast.
Keyed to the role. **The mage's own three (`glimmer`, `echo`, `fetch`) are
always known — ruled 2026-08-23 (Roc) — so they get no intro beats.**
Steering: bible's The mage & folk magic + Small canon.

| ID | Spell | Role (holder this life) | Method | Status |
|---|---|---|---|---|
| SPB-ignite | `ignite` | Blacksmith (Ilsa) | Local model — needs `content/magic/ignite.json`'s component table in context | — |
| SPB-temper | `temper` | Blacksmith (Ilsa) | Local model — component table in context | — |
| SPB-portion | `portion` | Baker (Toby) | Local model — component table in context | — |
| SPB-weigh | `weigh` | Baker (Toby) | Local model — component table in context | — |
| SPB-steep | `steep` | Herbalist (Mara) | Local model — needs `content/magic/steep.json`'s component table in context | — |
| SPB-preserve | `preserve` | Herbalist (Mara) | Local model — component table in context | — |
| SPB-scratch | `scratch` | Postman | Local model — component table in context | — |
| SPB-seal | `seal` | Postman | Local model — component table in context | — |
| SPB-dry | `dry` | Postman | Local model — component table in context | — |
| SPB-leap | `leap` | Priest | Local model — component table in context | — |
| SPB-waft | `waft` | Priest | Local model — component table in context | — |
| SPB-breath | `breath` | Farmer | Local model — component table in context | — |
| SPB-furrow | `furrow` | Farmer | Local model — component table in context | — |

## Festival-night scenes — deep three

Arc-landing-aware, bond-gated attendance (T9), loosened register. Steering:
bible's Festival night §Steering the night lines — including the past-soul
absence rule where it applies.

| ID | Soul | Method | Status |
|---|---|---|---|
| NGT-toby | Toby | Local model | — |
| NGT-ilsa | Ilsa | Local model | — |
| NGT-mara | Mara | Local model | — |

## Stretch — essence-reveal scenes (after everything above is gated)

Concise scenes that reveal a soul's personality or essence — what the current
thread registries (`cast/*-threads.md`) do, tighter. Not scoped to rows yet;
scope them when the core set is approved.

## Roll-up

| Category | Rows | Hand-written (Mara) | Local model |
|---|---|---|---|
| Intro | 1 | 0 | 1 |
| Greetings (deep 9 + texture 10) | 19 | 3 | 16 |
| Encounters | 9 | 3 | 6 |
| Spell beats | 13 | 2 | 11 |
| Festival night | 3 | 1 | 2 |
| **Total authored core** | **45** | **9** | **36** |

Update a row's status when its content is drafted/gated/built — this file is the
tracker, so it does carry state, as the one exception to "plans hold reasoning."
