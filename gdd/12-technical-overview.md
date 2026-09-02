# Technical Overview

Engine and platform, the two build tracks, minimum/target acceptance, and the definition of done. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. Risks, sequencing gates, and the MUST/SHOULD/STRETCH tiers live in [`13-scope-and-risks.md`](13-scope-and-risks.md).

## Engine & prototype

**Full vertical slice.** Ink Script backend integration to Unreal (UE5), the Point-and-Click toolkit (Fab marketplace), Wwise audio middleware (see [`10-audio.md`](10-audio.md)), 3D static-camera scenes.

**PIVOTED 2026-08-17 (Roc): the capstone ships from the Phaser build.** [`../phaser/`](../phaser/), Mode 4 — the integrated final version. **Unreal is post-capstone**, not cancelled: `RebirthCore`, the injected `v01_story.uasset` and the 205-tag table all survive as the port target. **The ink graph is unchanged** — both hosts read the same `story.json`, so nothing in the narrative pipeline moves.

*Why.* The Unreal snags were a **missing host layer**, not an ink problem. [`../tools/lantern/src/lib/play.ts`](../tools/lantern/src/lib/play.ts)'s `LanternPlayer` owns the satchel, day loop, move budget, pack-triage and NPC presence — and the resolver declares that deliberately (`tools/resolver/src/graph.ts:195` marks `present_<soul>` as written by `DAY_START_WRITER`, a *host* writer; the emitted ink only reads it). Phaser works because it imports `LanternPlayer`; `RebirthCore` reimplemented parts of that layer and never ported `applyPresence`. Design record: [`../plans/2026-08-17-phaser-pivot-mode4-plan.md`](../plans/2026-08-17-phaser-pivot-mode4-plan.md).

**Fast prototype.** ink + html: the fastest way to prove the narrative pipeline in a browser. Ink is **not throwaway** — it is the production narrative engine, carried into Unreal via ink-to-UE integration. The ink content graph built in prototype is the same graph the slice ships on.

**The ink runtime is Inkpot** (The Chinese Room), ruled 2026-08-02. inkcpp was rejected: its Fab listing stops at UE 5.7 and the engine is **UE 5.8**. The UE build lives in a Perforce workspace (`rebirth.uproject`, workspace `roclee_CCI-MSiAegis-02_459`), not this repo. **The seam is compiled ink JSON** — the resolver emits `story.json` (`inkVersion 21`), inklecate output, the same format an `InkpotStoryAsset` wraps; whether Inkpot's importer ingests pre-compiled JSON directly (vs. recompiling `.ink` source with its bundled inklecate) is unverified. [`../knowledge-base/narrative/ink-unreal-integration.md`](../knowledge-base/narrative/ink-unreal-integration.md) is the original evaluation; its inkcpp-first recommendation is superseded, its comparison table remains useful.

## Two build tracks (so review never blocks assets)

- **Track A: narrative pipeline proof (ink/html).** Proves the seed-to-payoff loop and the content pipeline. Gated by line review.
- **Track B: visual/asset build (Unreal).** Environments, static-camera scenes, audio tags. Runs independently, so review time never stalls visual work.

**Amended 2026-08-17 by the pivot.** Track B is now the **Phaser build**, and it is the ship track rather than a parallel one. The two-track rule itself is unchanged and still binding — story work is never gated on tool work, and the three-link B→A allowlist (`GP-18`, `GP-19`, `GP-20`) stands. The Unreal build becomes a post-capstone track.

See [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md) for which agent builds which component across these two tracks.

## Minimum / target acceptance

Each risky feature gets a floor bar and a reach bar:

| Area              | Minimum acceptance                                             | Target acceptance                                                 |
| ----------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Core loop**     | One week loads and reaches festival night.                     | Plus the turn of the year + a decision-based ending vignette.      |
| **Reshuffle**     | One hand-scripted role-swap plays on camera.                   | A second hand-authored reshuffle instance is built to prove the concept out. *(This is a build/proof-scope target — how many reshuffle instances get hand-authored for the demo — not a cap on the live mechanic, which is [`07-cast.md`](07-cast.md)'s per-soul re-deal, unbounded in the shipped game.)* |
| **Save-state**    | Bond + collection persist across one new life.                 | 3 save slots; meta-hub shared; in-game home resets empty.         |
| **Deep-soul arc** | 1 soul's arc hand-authored, reads distinct, seed→payoff lands. | Agent-generated lines pass the side-by-side distinctness read. **Met 2026-07-25** — a blind, model-labels-stripped read of five arms; the winning arm returned 6 of 6 shippable lines. |
| **Festival**      | One festival scene renders at day's-end.                       | 3 tiers (quiet/warm/grand) + the rare souls-of-the-world display. |
| **Reciprocity**   | Bond persists across lives.                                    | Dialogue visibly warms over repeated lives. **Target narrowed 2026-08-17** — see below. |

**Reciprocity, narrowed 2026-08-17.** The minimum bar is unaffected: bond still persists across lives. The *target* loses its headroom. There are three bond bands, and with one attentive life now able to reach HIGH ([`06-world-and-progression.md`](06-world-and-progression.md)), a second life has no band left to climb into. Dialogue can still warm within a life; it can no longer warm *because* it is a later life. Recorded rather than dropped — restoring it needs a band above HIGH, or per-life variants that do not key on band.

## Definition of done

- **You can play one week through to the festival** — the full core loop, start to festival night.
- ~~**The game reshuffles** — a new life re-deals the souls' roles.~~ **Cut from the DoD 2026-08-17 (Roc).** The mechanic itself stands and is unchanged ([`06-world-and-progression.md`](06-world-and-progression.md)) — this is a slice scope call, not a design deletion. It is simply not demonstrated at the capstone.
- **The game saves and restores state** — bond levels and collection persist across a new life. **Restated 2026-08-17:** the bar the capstone is held to is *close the game, reopen it, and resume where you left off.*
- **One soul's storyline is complete** — the single deep-soul arc plays end-to-end, seed to payoff.
