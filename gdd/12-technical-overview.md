# Technical Overview

Engine and platform, the two build tracks, minimum/target acceptance, and the definition of done. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. Risks, sequencing gates, and the MUST/SHOULD/STRETCH tiers live in [`13-scope-and-risks.md`](13-scope-and-risks.md).

## Engine & prototype

**Full vertical slice.** Ink Script backend integration to Unreal (UE5), the Point-and-Click toolkit (Fab marketplace), Wwise audio middleware (see [`10-audio.md`](10-audio.md)), 3D static-camera scenes.

**Fast prototype.** ink + html: the fastest way to prove the narrative pipeline in a browser. Ink is **not throwaway** — it is the production narrative engine, carried into Unreal via ink-to-UE integration (`inkcpp` / `Inkpot`; see [`../resources/ink-unreal-integration.md`](../resources/ink-unreal-integration.md) for the engineering evaluation). The ink content graph built in prototype is the same graph the slice ships on.

## Two build tracks (so review never blocks assets)

- **Track A: narrative pipeline proof (ink/html).** Proves the seed-to-payoff loop and the content pipeline. Gated by line review.
- **Track B: visual/asset build (Unreal).** Environments, static-camera scenes, audio tags. Runs independently, so review time never stalls visual work.

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
| **Reciprocity**   | Bond persists across lives.                                    | Dialogue visibly warms over repeated lives.                       |

## Definition of done

- **You can play one week through to the festival** — the full core loop, start to festival night.
- **The game reshuffles** — a new life re-deals the souls' roles.
- **The game saves and restores state** — bond levels and collection persist across a new life.
- **One soul's storyline is complete** — the single deep-soul arc plays end-to-end, seed to payoff.
