# Art Direction

The visual-cohesion system and the Style/Art-Direction Agent's I/O schema. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. Sonic identity and the leitmotif recognition mechanic live in [`10-audio.md`](10-audio.md) — this file covers the visual half of what an earlier draft called "Art & Audio Direction."

## Tone

**Tone words:** Ghibli-warm, painterly, quietly melancholic, lived-in, with dialogue modeled on *Frieren*.

Concept references set the rules, not the assets: the desaturation discipline and flat emotional register of *Frieren*, the palette warmth and environmental wonder of Studio Ghibli, the static-camera living-diorama of *Myst*. No imagery is reproduced.

## Built in 3D

The planned engine is Unreal, using the Point-and-Click toolkit from the Fab marketplace. The goal is 3D levels for visual depth, with one built environment reused from many angles: one 3D location yields many static-camera scenes.

The replayed festival week across the turn of the year then renders cheaply: the same level at a different angle, time-of-day, or seasonal state gives the "time moved, we returned" read with no intertitle.

**Locked 2026-07-18** ([`../resources/phase-3-decisions_draft.md`](../resources/phase-3-decisions_draft.md) H17): 3D wins on depth-for-free (parallax without hand-painting it) plus reusing levels across angles/time-of-day/season states — roughly 3 builds plus state variants, not 9 separate builds.

**The risk + its mitigation.** 3D can read sterile and un-Ghibli, so warmth is held by a system rather than by hand-finishing every asset — the **No Man's Sky model**: a hard-constrained palette (bands, not a free wheel), a locked silhouette vocabulary every generated variant reads as a variant *of*, and one key-art board plus one review eye. Cohesion comes from *rules + one review eye*, not per-asset hand-finishing. This is exactly the contract the Style/Art-Direction Agent below checks against.

## Going big

There is no single global "epic" register. Each domain of a big moment gets the register that fits it, and the words stay plain in all of them: social payoffs stay narrative-dialogue driven, while world-opening and magic carry the Outer Wilds revelation and Ghibli awe.

The swell is visual, scale, or revelation — the festival's souls-of-the-world display (see [`03-core-loop.md`](03-core-loop.md)) is the slice's one authored example. Wonder is also sprinkled in mid-run moments, framed either large (a wide tableau) or small (a zoomed-in detail).

## The Style / Art-Direction Agent

Owns the visual cohesion contract: the color grammar (bands, not a free wheel) and the silhouette vocabulary, expressed as **machine-checkable rules**. Checks each generated art variant reads as a variant *of* the locked vocabulary, flagging palette drift and silhouette breaks. Generates no final art and sets no story; it names and checks the rules a variant must satisfy.

- *In:* `{ new_assets:[{ asset_id, asset_type }], locked_palette_bands, silhouette_vocabulary, key_art_ref }`
- *Out:* `{ variant_checks:[{ asset_id, status:"PASS|FLAG", rule_violated }], palette_delta }`
- *When:* whenever new visual assets enter the slice. *Gate:* soft: the single review eye signs off flags.

See [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md) for this agent's place in the full roster and token budget.
