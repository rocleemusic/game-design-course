# Assignment 10 — Complete AI Dev Pipeline

**Student:** Roc Lee
**Capstone Game Title:** *Rebirth* (working title) — shipping page: **The Festival of Souls**
**Game Concept Brief:** A cozy roguelite point-and-click adventure set in a hand-painted village, in the spirit of *Outer Wilds*, *Spiritfarer*, and *Frieren*. You explore, collect, and talk to a small cast of souls across one in-game week that builds to a festival night. All dialogue and world content is written by an AI agent pipeline built for this game, then compiled into the same ink-based story data the shipped build reads at runtime — this document is the record of that pipeline and what it cost.

---

## Deliverable 1: Playable Link

**Playable Game Link:** https://rocdoessound.itch.io/the-festival-of-souls

**⚠️ Status: needs a fresh deploy before this counts as current.** The live page above is a real, running build (Mode 5, the shipped mode), but it does not yet reflect the last round of edits made this week. Before submitting, run:

```bash
cd phaser
npm run build:itch      # tsc --noEmit + vite build, content bundled fresh
npm run deploy:itch     # butler push to the itch.io channel
```

A stranger opening the link needs no setup — it boots straight into the mode picker and then the game.

---

## Deliverable 2: Pipeline Source Code & Engine Integration

**Pipeline Repository Link:** https://github.com/rocleemusic/game-design-course (this folder — `assignment-10/`)
**Pipeline Run Video Link:** *[TODO — record a short screen capture of a content-generation pass or the resolver build step, then paste the link here]*

**This folder is self-contained.** Everything the tables below name — every agent contract, the resolver and Lantern review-tool source, the bundling/deploy scripts, the in-engine editor code, the benchmark and cost-analysis reports — is copied in here, not just linked to a private repo. Three things are named but genuinely can't be copied because they aren't files in any repo: **ComfyUI** and the **Blender MCP connector** (real software running on separate machines/processes, described in Stage 9, demonstrated in the linked video) and the live **itch.io page** (Deliverable 1). Two things are named but deliberately excluded as reproducible build output, not source: `node_modules/` for the two TypeScript tools (regenerate with `npm install` from the included `package.json`), and the screen-capture image set + the 73MB self-contained HTML page `phaser-tools/screen-flow/` builds from them (regenerate by running `capture.mjs` then `build-flow.mjs` against a live build — the scripts themselves are included).

### Target Game Engine

**Phaser 4** (TypeScript, WebGL/Canvas), shipped as a static web build to itch.io. A parallel Unreal 5.8 port exists as a design target for after the capstone — it is not the ship target and nothing below depends on it.

### Automated flow description

Content never gets hand-typed into the engine. It moves through one chain:

**Content JSON (agent-written, human-gated)** → **the resolver** (`tools/resolver/`, deterministic — no LLM) compiles four data files into a scene graph, an ink tree, and a day schedule → **inkjs** compiles that ink into `story.json` → **`bundle-content.mjs`** filters to only human-approved records and copies everything Phaser needs into `phaser/public/` → **Phaser loads it at runtime** → **`deploy-itch.mjs`** pushes the built game to itch.io with `butler`.

Every step after the human content gate is a script, not a person. Nobody hand-edits a game file to make an agent's output show up on screen.

### The crew, stage by stage

**Legend:** 🤖 AI agent seat · ⚙️ deterministic script, no LLM · 👁️ human review surface (no AI)

**1. Steering**

| Seat | Path (in this folder) | What it does |
|---|---|---|
| 🤖 Narrative Director | `narrative-pipeline/agents/narrative-director.md` | Reads the story corpus, proposes the arc doc that steers every soul's writing |
| Orchestrator | `narrative-pipeline/agents/orchestrator.md` | Sequences the stages below, routes flags, never writes content itself |

**2. Content generation** — each agent is called one slot at a time, reports back, never calls another agent directly

| Seat | Path (in this folder) | What it does |
|---|---|---|
| 🤖 Narrative Architect | `narrative-pipeline/agents/narrative-architect.md` | Persona cards, trait axes, seed→payoff design per soul — and the scene structure every line-writer below builds from |
| 🤖 Choice Designer | `agents/choice-designer.md` | Runs after the Architect's brief for a thread. Fills in the conversation's structure — choice nodes, gates, options, outcomes — as a content block and a mermaid graph. Decides *when and how* something is reached; never *what* gets revealed (Architect's job) or the actual words (Lines' job). Roc approves every graph before a line is written |
| 🤖 Content / Dialogue (spec path) | `narrative-pipeline/agents/content-dialogue.md` | The original design: every player-facing line written by a Claude agent, as one step in the multi-agent crew |
| 🤖 Content / Dialogue (live path) | `pipeline-runs/2026-08-17-register-loosening/` (the model benchmark), `pipeline-runs/2026-08-25-thread-driven-scenes/` (the 469-slot production run) | **What actually writes lines today.** A self-hosted open-weight model on my own GPU, fed a structured-context prompt — the full scene state (persona card, canon constraints, the approved structure) packed into one prompt so the model has exactly what it needs to write the scene correctly in a single pass, instead of a multi-turn conversation it has to remember its own way through. This benchmark settled the split: Claude authors structure, local models write the lines. See Deliverable 3 for the model-selection story |
| 🤖 Batch Reconciler | `agents/batch-reconciler.md` | Runs after a Content batch finishes and before Roc's prose gate. Reads every line file in the batch *together* — the one view no per-slot writer has — and varies constructions that repeat across files (the same supply-move phrasing reused four times, say). The only seat besides Content itself allowed to rewrite prose, and only to vary repetition, never structure or meaning |
| 🤖 Role Spell Designer | `agents/role-spell-designer.md` | A project-level seat, called by Roc directly rather than inside a scene run: given one of the seven civic roles, authors exactly three spells that role's daily work would plausibly produce — never phrased for one specific soul, since whoever is dealt that role next life must know them |
| 🤖 Component Item Designer | `agents/component-item-designer.md` | The companion project-level seat: takes a batch of spell component requirements from Role Spell Designer and derives the item records that satisfy them — one item per distinct requirement, deduplicated across spells, sourced to real screens. Items are derived from what spells need, never authored freestanding |
| 🤖 Spell Schema / Item Schema | `narrative-pipeline/agents/spell-schema.md`, `item-schema.md` | Define the record shape Role Spell Designer and Component Item Designer's output must match, and run as their own per-scene generation step in the original crew design |
| 🤖 Consistency Verifier | `narrative-pipeline/agents/consistency-verifier.md` | Flags a batch against locked rules and voice — review only |
| 🤖 QA / Playtest (pipeline) | `narrative-pipeline/agents/qa-playtest.md` | Traversal/logic flags on new content before it reaches the graph |

Both line-writing paths feed the same downstream chain — the same structure format, the same human read, the same `content-check.mjs` gate before anything compiles. Nothing here ships unread — Roc approves every line before it becomes canon content.

**3. Compilation — deterministic, this is where content becomes game data**

| Tool | Path (in this folder) | What it does |
|---|---|---|
| ⚙️ Resolver | `tools/resolver/` (source + data + tests; `node_modules/` excluded, regenerate with `npm install`) | Turns approved content JSON into `graph.json`, the `ink/` tree, and the day schedule. `--emit-story` compiles the ink into `story.json` — this is the exact file Phaser reads |
| ⚙️ `content-check.mjs` + lint scripts | `tools/*.mjs` | Blocks the build if any id, index, or slot cap is wrong |

**4. Human review surfaces — no AI, but part of how content and layout get authored**
| Tool | Path (in this folder) | Does it write back into the game? |
|---|---|---|
| 👁️ Lantern | `tools/lantern/` (source + tests; `node_modules/` excluded) | **Yes, indirectly.** Reviewer edits round-trip through `edits.json`, and the resolver's `applyEdits` folds them back into the source before the next compile |
| 👁️ Content Approval Editor | `phaser-tools/content-editor/` | **No.** Approve/reject + notes only, written to a `review.json` sidecar. It gates content, it doesn't touch it |
| 👁️ In-engine hotspot editor (`EditModeSystem`, press `E` in-game) | `phaser-src/render/EditModeSystem.ts` | **No live write.** Draws region rects on the real backdrop, then exports the merged result to the clipboard in the exact `regions.json` shape. A person pastes it into the real file and rebuilds — same "author here, build to see it" shape as everything else, just for layout instead of dialogue |
| 👁️ Screen-Flow | `phaser-tools/screen-flow/` (scripts + mockups; the generated screenshot set and the assembled review page are excluded as reproducible output — see the note above Target Game Engine) | **No.** Captures every screen, builds a static review page with feedback boxes. Pure review artifact |

**5. Bundling and deploy**
| Tool | Path (in this folder) | What it does |
|---|---|---|
| ⚙️ `bundle-content.mjs` | `phaser-tools/bundle-content.mjs` | Filters to approved-only content, copies it into `phaser/public/` where the browser fetches it |
| ⚙️ `deploy-itch.mjs` | `phaser-tools/deploy-itch.mjs` | Rebuilds and pushes to itch.io via `butler` |

**6. Verification, after the build runs**
| Seat | Path | What it does |
|---|---|---|
| 🤖 QA Adversary | `agents/qa-adversary.md` (contract, in this folder); the runnable tool and its full run of record are in the sibling [`../assignment-09/`](../assignment-09/) folder in this same repo | Drives the real game through 250+ steps of deliberately bad input in headless Chromium, files structured findings |
| 🤖 UI Verifier / UI Builder | `agents/ui-builder.md`, `agents/ui-verifier.md` (contracts, in this folder); full before/after evidence in the sibling [`../assignment-07/`](../assignment-07/) folder | Verifier scores a real screenshot against the visual style guide; Builder fixes exactly what it named |
| ⚙️ `playtest.mjs`, `walk.mjs`, `gate-audit.mjs`, `presence-audit.mjs` | `phaser-tools/` | Scripted health checks — full-week walk, gate logic, NPC presence, orphaned content |

**7. Process, not code — the rituals that keep the above honest**
| What | Path (in this folder) | What it does |
|---|---|---|
| `/gdd-sync` | `commands/gdd-sync.md` | Reconciles a session's rulings back into the GDD, flags superseded doc sections. Proposes, never writes without approval |
| Systems Documentarian | `agents/systems-documentarian.md` | Regenerates `phaser/ARCHITECTURE.md` — the seam diagram and module table — from what's actually on disk, at build-phase boundaries |
| `/pm` | `skills/pm/SKILL.md` | Reads the task board, reports what's late, blocked, or unreviewed — the first move of any session |
| Session handoffs | `plans/_handoffs/` (one representative example included) | A narrative "what happened, what's next" note, deliberately left to go stale — durable rulings get promoted into the GDD or `CONTEXT.md`, not left here |

**8. Audio pipeline — a separate loop, for sound, that writes straight into the engine**

| Seat | Path (in this folder) | What it does |
|---|---|---|
| 🤖 Audio Implementer (propose) | `agents/audio-implementer/CONTEXT.md`, Stage 1 | Scans `phaser/src/` for a real, already-coded interaction with no sound behind it — a click, a screen transition, a spell cast — and writes one entry to `asset-list.json` with `status: "proposed"`. Never invents an interaction; every proposal names a file and line |
| 👁️ Human (make + stage) | `agents/audio-implementer/staging/` | Roc makes or sources the sound and drops the file in `staging/`, named to match the proposed slot's id — the one hand-made step in the loop |
| 🤖 Audio Implementer (wire) | `agents/audio-implementer/CONTEXT.md`, Stage 3 | Moves the staged file into `phaser/public/audio/<category>/`, writes the real `this.sound` call at the named interaction site, routed through a shared audio module so it obeys the Options-screen volume slider — never a raw call that bypasses it. Marks the ledger entry `implemented` |

**This is the one agent-driven loop that writes directly into both the engine's asset folder and its source code, no clipboard step and no separate rebuild-and-paste** — Stage 3 edits `phaser/src` and moves the real asset file itself. The tradeoff for that directness: a human still has to make the actual sound, since nothing in the loop generates audio — Stage 1 and Stage 3 are proposal and wiring, not sound synthesis. Ledger state (`proposed` → `staged` → `implemented`/`rejected`) lives entirely in `asset-list.json`, the same one-source-of-truth discipline the other pipelines use for their own state.

**9. Art pipeline — 3D reference + local diffusion, for backdrops, portraits, and item icons**

Unlike the narrative and audio loops, this one has no persistent agent seat file — it runs as tool calls inside a session, plus real image-generation software on separate local machines, not through Claude at any generation step. **Blender and ComfyUI themselves cannot be copied into this folder** — they're running software on other machines, not repository files — so this stage is documented and demonstrated in the video rather than included as source.

| Tool | Path / where it runs | What it does |
|---|---|---|
| Blender MCP (reference pull) | in-session, via the `blender` MCP connector — external | Searches Sketchfab/PolyHaven for a real-world 3D model matching an item, renders it clean on a transparent background — the source image the restyle pass repaints |
| Grok (fallback reference source) | manual — outside any agent or tool, pasted by hand | For items with no usable 3D reference (poor Sketchfab coverage — liquids, abstract concepts, bespoke narrative objects), a hand-written prompt goes into Grok's chat interface instead, and the resulting image is downloaded and fed into ComfyUI as the img2img source in place of a Blender render. Done this way specifically to avoid a paid image-generation API call — Grok's chat interface is free where a dedicated API would be metered |
| ComfyUI (restyle pass) | external — a local SDXL install on its own machine (moved from an AMD/ZLUDA box to an RTX 4070 box mid-project), not Claude | img2img: checkpoint + a Ghibli-style LoRA + the game's locked palette prompt preamble repaints the reference render to match `gdd/09-art-direction.md` (included in this folder), denoise tuned to hold the source shape while changing the surface |
| `run_ghibli_batch.py`, `upscale.py`, `color_match.py` | live on the art-pipeline machine, not in this repo | Batch orchestration, tiled upscaling, and palette pull-back toward the game's locked colors — plain scripts, no LLM |
| FaceDetailer (character faces) | ComfyUI custom node — external | Automated crop → upscale → redraw → feathered-paste at the face specifically, since a full-body render doesn't give a diffusion model enough resolution to draw a face correctly on its own |
| Background removal | `commands/remove-background.md`, `tools/remove-background.py` (both included) | Cuts a generated backdrop out to a transparent PNG so it drops into the game clean — flood-fill for hard-edged art (portraits, item icons), a two-render matte technique for soft-edged art (glows, VFX) |

**Nothing here ships automatically.** Every stage lands in a `_staging/` folder (`phaser/public/art/items/_staging/`, `.../key-items/_staging/`, or a machine-local output folder for backdrops and characters) and waits for Roc's review before anything moves to `phaser/public/art/` — the same staged-until-approved discipline the narrative and audio pipelines use, just with no scripted promotion step yet: moving a file from staging to shipped is still done by hand.

The only place a human types content directly into a game file is the pre-compile approval gate — everything downstream of "approved" is scripted, except the audio loop above (a human supplies the sound itself) and the art pipeline above (a human reviews and promotes every staged image by hand; nothing auto-ships past ComfyUI).

**10. Project-level agents — Roc talks to these directly; not part of any one content or engine run**

| Seat | Path | What it does |
|---|---|---|
| 🤖 Production/PM | `agents/production-pm.md` | Reads the Paca task board and milestone calendar, reports delivery risk, review-queue backlog, and parallelism breaches. Never decides scope — writes and updates task state and a readiness doc, nothing else |
| 🤖 Assignment Scout | `agents/assignment-scout.md` | Surfaces candidate work toward a future course assignment — the "before" half of a before/after capture. Documentation only; never touches game or content files |
| 🤖 Gate Recorder | `agents/gate-recorder.md` | After Roc rules on a content batch, writes that ruling's status/roll-up/index entries. Data records only |
| 🤖 Ruling Promoter | `agents/ruling-promoter.md` | Writes a ruling into the agent contracts themselves, so the next run doesn't repeat a correction Roc already made once. Edits agent contract files, never game content |
| 🤖 Stale Rule Auditor | `agents/stale-rule-auditor.md` | Flags sentences in a contract that a new ruling just made false. Review-only, flags only |
| 🤖 Contract Audit | `agents/contract-audit.md` | A 10-criterion rubric run manually against every seat's contract file — keeps the crew's own paperwork honest. Review-only, no enforcement |

These six don't generate game content or touch the engine — they're the crew's self-maintenance layer: keeping the task board honest, keeping each seat's own contract file accurate as rulings pile up, and surfacing what to work on next. Ruling Promoter and Stale Rule Auditor in particular are why the contracts copied into this folder stay close to what the crew actually runs, instead of drifting the way a hand-maintained spec would.

---

## Deliverable 3: Pipeline Audit & Cost Analysis

### Pipeline production & functionality

**What the pipeline produced, present in the playable build:** persona cards and full dialogue trees for six souls (Bex, Ilsa, Juno, Mara, Pip, Toby), the spell and item records that back the magic system, the compiled `story.json` the whole week runs on, and every UI screen re-skinned onto the visual style guide through the Assignment 7 loop.

**Manual steps still in the loop:**
1. **The content approval gate itself.** Every generated line is read by a human before it's canon. This is deliberate, not friction — the register the game writes in (short, weight-preloaded, anti-ornamental) is exactly the kind of thing a model drifts off without a human catching it.
2. **Lantern and the in-engine hotspot editor both stop at export, not write.** Lantern's edits round-trip automatically; the hotspot editor's rects go to the clipboard, and a person pastes them into `regions.json` and rebuilds.
3. **Deploy is a manual command.** `npm run deploy:itch` has to be run by hand.
4. **Concept art for anything with no 3D reference goes through Grok by hand.** A prompt gets pasted into Grok's chat interface, the resulting image gets downloaded, and that file becomes the img2img source ComfyUI restyles — three separate hand steps (write the prompt, paste it in, retrieve the file) with no script connecting them. This one is deliberate, not an oversight: it's there specifically to avoid paying for a metered image-generation API when Grok's chat interface does the same job for free.

**What full automation would take:** a real write API from Lantern and the hotspot editor straight into their source files (skip the clipboard step), a CI hook that runs the bundle-and-deploy chain automatically whenever content crosses the approval gate, and — for the Grok step — a paid image-generation API called directly from a script instead of a human relay. That last one is the clearest case in this whole pipeline of a manual step that exists purely to save money, not for quality or safety reasons; automating it is a cost decision, not an engineering one. The content gate itself is the one step I would *not* automate away — it's the thing keeping the writing on-voice, not a bottleneck to route around.

### Architectural reflection

**Current decision I'd change:** I ran narrative content and engine/tooling work as parallel tracks without first writing down who owns which shared fact. The clearest cost of that: two separate systems ended up independently tracking which gates were cleared — `Gates.ts`'s graph parse keeps one cleared-set, `GateEngine` keeps another — and they're allowed to disagree about the same door. The adversarial QA agent ([Assignment 9](../assignment-09/)) hit that exact split 133 times in one run, and the code's own comment already admitted the gap before the agent found it.

**Specific alternative:** before splitting into parallel tracks, write a short ownership contract for every shared piece of state (gates, presence, inventory) — one line answering "which system is allowed to write this fact" — and prototype that seam with a throwaway script before building it inside whichever feature needs it first. In practice that means running the Systems Documentarian's architecture-record pattern *before* the first parallel build starts, not after the split already happened. I'd also prototype more up front generally — several of this session's reworks (VFX kind changes, the notebook layout rebuild) were things a fifteen-minute static mockup would have caught before code was written around the wrong shape.

### Cost analysis

**Total actual run cost — from a real, controlled benchmark, not an estimate.** [`pipeline-runs/2026-07-25-giver/RESULTS.md`](pipeline-runs/2026-07-25-giver/RESULTS.md) is a genuine measured pipeline run: ten Claude agents (a 5-arm model benchmark plus five verification passes), computed per-call from the real transcripts at published rates. **Phase 1 cost $8.37 exactly** (2,411,567 billed tokens) to produce one soul's persona card, one echo, and six candidate lines. A follow-up demo run at the winning model config (**Phase 2**) cost 1,009,094 billed tokens to produce one full scene end to end — and the report projects that out to the whole game: **the full one-week festival slice (all 8 souls' cards plus 15 scene-appearances) costs about $26 at zero revisions, and about $100 at the 3.8× revision rate this project actually measured.**

That's the clean number for the Claude-run half of the pipeline (structure-authoring and verification). It doesn't cover the line-writing itself, which — per Deliverable 2 — now runs on a free local model, so I also pulled a second, cruder number: every Claude Code session that touched this repo across six weeks (2026-07-19 to 2026-08-30, 129 sessions, everything — build fixes, planning, this document, not just clean generation runs), priced at published API rates, comes to **≈$9,990**. That figure is not comparable to the $26–$100 above — it's total project activity, not one content run — but it's the honest answer to "what would six weeks of this cost metered," which the sustainability question below needs.

**Most expensive pipeline step — verification, not generation, and not model choice.** The Giver benchmark measured this directly: the five Consistency Verifier passes were **46–52% of total token spend**, roughly equal to every generation agent combined. And that cost isn't "thinking" — the report traces it to each of the ten agents independently re-reading the same ~50K-token spec bundle (`register.md`, `guardrails.md`, two schemas) every time it ran, with every tool-call turn re-billing that whole cached prefix. One Architect agent alone turned a 54K-token job into 414K billed tokens across eight turns just from re-fetching its own spec. The expensive step is a caching gap, not a hard reasoning problem.

**Solo/small-team sustainability:** on the numbers that actually matter — one content run — this pipeline is cheap: $26 to $100 for a full week of narrative content is nothing for a solo dev, even metered. The real threat to sustainability isn't per-token price, it's **revision volume**: the benchmark's own conclusion is that the same content run costs 3.8× more once you count real revision cycles, and the report states it outright — *"the 2M crew budget is not a generation budget, it is a revision-discipline budget."* The broader six-week, whole-project figure (≈$9,990) tells the same story at a different scale: that number is dominated by iteration across the whole capstone, not by any one expensive model call. For a solo dev or small team, the lever that matters is cutting revision cycles through better specs, not switching to cheaper models.

### Mid-project cost-reduction change

**The cleanest one, with hard before/after numbers: stop making every agent fetch its own spec.**

**Before:** each subagent independently called `Read` on its 6–8 spec files every time it ran. Because every tool-call turn re-bills the whole cached prefix, this was expensive in a way that had nothing to do with the model or the task — one Architect agent's actual 54K-token job billed as **414,372 tokens** across 8 turns, just from re-fetching the same ~50K-token spec repeatedly.

**After:** the same spec content gets inlined directly into the prompt instead of fetched via tool call — identical content, handed to the agent instead of made to go get it. Verified in a controlled rerun at the same config: the Architect slot's billed volume dropped to **51,359 tokens** — a measured **6.9× reduction**, for zero quality cost. A second, independent fix (restating the full constraint set on every revision instead of naming only the defect) cut the *next* soul's total run cost in half again (1,009,094 → 457,268 billed tokens, Giver vs. Kinbound), by eliminating a failure mode where the agent silently traded away one constraint while fixing another.

**How much does moving Content generation off Claude actually save? An extrapolation from the same benchmark, shown with its assumptions.** The Giver benchmark's own dollar breakdown lets this be estimated, not guessed. Phase 1 priced Content (Fable) at $1.65 against its paired Verify pass at $0.77 — so of every dollar spent on Content+Verify together, about **68% is Content**. Phase 2's component table puts Content+Verify at 107,140 of 209,312 total tokens for one soul-appearance — **51% of a full run.** Multiplying those fractions: Content alone is roughly **35% of total pipeline cost.** Applied to the slice-level projections above ($26 clean, $100 at the observed revision rate), moving Content off Claude is worth an estimated **≈$9 at zero revisions, ≈$35 at the observed rate** — and $35 is likely a floor, not a ceiling, since the benchmark's own costliest finding was Content's revisions specifically (silent constraint-trading, four defects out of four before the fix), meaning Content probably absorbed more than its proportional share of the revision blowup.

**A second, real cost change, already covered in Deliverable 2: moving line-writing itself off Claude and onto a free local model — now with a measured electricity cost, not an assumption.**

I measured this directly rather than assuming "free," documented in full in [`plans/_handoffs/2026-08-30-local-cost-analysis-handoff.md`](plans/_handoffs/2026-08-30-local-cost-analysis-handoff.md). On the machine that runs generation (RTX 4070 Super, 220W rated), I sampled live GPU power draw with `nvidia-smi` during five clean generation calls on Muse-12B, the model actually used for two of the three deep souls: **173.7W average, 189.0W peak.** For total runtime, I summed every logged `Total:X.Xs` line across every server log I could find — 287 calls, 1,790 seconds, **≈0.497 hours.** That's a documented floor, not the true total — the production logs are fragments from around server restarts, confirmed against one run's own summary file showing 95 successful calls against only 3 logged completion lines — but it's real measurement, not a guess, and it's the best figure available without a fuller log.

At my actual electricity rate (21–24¢/kWh), the measured floor comes to **≈$0.02**; even inflating the hours 20× to cover what the truncated logs missed, it stays under **$0.45**. Either way it's small enough not to move the number below.

**Net savings — what moving Content off Claude actually nets, after paying for the replacement:**

| | Content cost avoided | Electricity spent | **Net savings** |
|---|---|---|---|
| Zero revisions | ~$9 | ~$0.02 | **~$9** |
| Observed 3.8× revision rate (the realistic case) | ~$35 | ~$0.02–$0.45 | **~$35** |

Electricity is close to a rounding error against the Claude cost it replaces — this is close to pure savings, not cost shifted elsewhere. The one caveat worth carrying forward: this is a **per-run figure**, scaled from one benchmarked soul-scene to the full 15-scene slice. It's real, but it's not the total saved across every generation pass run so far this project — that number is a multiple of this one, not this one itself.

---

## Appendix — where the real evidence lives, all in this folder

- Agent contracts (full crew): [`agents/`](agents/), [`narrative-pipeline/agents/`](narrative-pipeline/agents/)
- Engine-integration source (resolver, Lantern, content-editor, bundler, deploy script, the in-engine hotspot editor): [`tools/`](tools/), [`phaser-tools/`](phaser-tools/), [`phaser-src/`](phaser-src/)
- The measured cost benchmark (Phase 1 $8.37, Phase 2 demo run, the caching fix, the Giver-vs-Kinbound revision comparison), full folder including raw arm outputs and the call-by-call run log: [`pipeline-runs/2026-07-25-giver/`](pipeline-runs/2026-07-25-giver/)
- Benchmark and model-tiering rationale: [`pipeline-runs/benchmark-plan.md`](pipeline-runs/benchmark-plan.md)
- Local-model line-writing benchmarks, full folders: [`pipeline-runs/2026-08-17-register-loosening/`](pipeline-runs/2026-08-17-register-loosening/), [`pipeline-runs/2026-08-25-thread-driven-scenes/`](pipeline-runs/2026-08-25-thread-driven-scenes/)
- The measured local-generation electricity numbers and a representative session handoff: [`plans/_handoffs/`](plans/_handoffs/)
- The `/pm` skill and `/gdd-sync` command: [`skills/pm/SKILL.md`](skills/pm/SKILL.md), [`commands/gdd-sync.md`](commands/gdd-sync.md)
- Adversarial QA run of record (gate-tracking split, 133 hits): [`../assignment-09/report/2026-08-26-seed20260826/`](../assignment-09/report/2026-08-26-seed20260826/)
- Visual style-guide loop: [`../assignment-07/`](../assignment-07/)
