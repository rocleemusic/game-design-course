# Art Direction

The visual-cohesion system and the Style/Art-Direction Agent's I/O schema. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. Sonic identity and the leitmotif recognition mechanic live in [`10-audio.md`](10-audio.md) — this file covers the visual half of what an earlier draft called "Art & Audio Direction."

## Tone

**Tone words:** Ghibli-warm, painterly, quietly melancholic, lived-in, with dialogue modeled on *Frieren*.

Concept references set the rules, not the assets: the restrained, flat emotional register of *Frieren* (its literal color-desaturation was lifted 2026-08-22 — see the Prompt-preamble section below), the palette warmth and environmental wonder of Studio Ghibli, the static-camera living-diorama of *Myst*. No imagery is reproduced.

## Built in 3D — the target medium

The planned engine is Unreal, using the Point-and-Click toolkit from the Fab marketplace. The goal is 3D levels for visual depth, with one built environment reused from many angles: one 3D location yields many static-camera scenes.

The replayed festival week across the turn of the year then renders cheaply: the same level at a different angle, time-of-day, or seasonal state gives the "time moved, we returned" read with no intertitle.

**Locked 2026-07-18:** 3D wins on depth-for-free (parallax without hand-painting it) plus reusing levels across angles/time-of-day/season states — roughly 3 builds plus state variants, not 9 separate builds.

**Amended 2026-08-17 (Roc). 3D stays the target; the capstone ships 2D.** The 2026-08-17 pivot moves the capstone build to Phaser ([`12-technical-overview.md`](12-technical-overview.md)), which renders 2D painted backdrops. **The lock's reasoning above is not withdrawn** — depth-for-free and reuse across angles, time-of-day and season still govern the 3D build, and that build is post-capstone rather than cancelled.

What this changes, and what it does not:

| | |
|---|---|
| **Changes** | The capstone's 20 screens are 2D backdrops, not camera angles on 3D sets. The reuse economy above does not apply to them — each is its own image |
| **Does not change** | Everything below this section. The palette bands, the silhouette vocabulary, the key-art board and the single review eye are **medium-agnostic** and bind the 2D pass exactly as written |

Asset pipeline for the 2D pass: **Blender and ComfyUI** (Roc, 2026-08-17). The Style/Art-Direction Agent's contract is unchanged — it checks variants against the locked vocabulary regardless of how they were made.

**The risk + its mitigation.** 3D can read sterile and un-Ghibli, so warmth is held by a system rather than by hand-finishing every asset — the **No Man's Sky model**: a hard-constrained palette (bands, not a free wheel), a locked silhouette vocabulary every generated variant reads as a variant *of*, and one key-art board plus one review eye. Cohesion comes from *rules + one review eye*, not per-asset hand-finishing. This is exactly the contract the Style/Art-Direction Agent below checks against.

## Going big

There is no single global "epic" register. Each domain of a big moment gets the register that fits it, and the words stay plain in all of them: social payoffs stay narrative-dialogue driven, while world-opening and magic carry the Outer Wilds revelation and Ghibli awe.

The swell is visual, scale, or revelation — the **Grand** festival's souls-of-the-world display, its top-tier display (see [`03-core-loop.md`](03-core-loop.md) and [`00-world-bible.md`](00-world-bible.md); prompts in [`grand-vignette-concept-prompt.md`](grand-vignette-concept-prompt.md)), is the slice's one authored example. Wonder is also sprinkled in mid-run moments, framed either large (a wide tableau) or small (a zoomed-in detail).

## Prompt preamble for generated art assets

Added 2026-08-19 (Roc). Image generators (Grok, ComfyUI, Midjourney) drift off-palette on every prompt unless you hand them a fixed preamble. This section is that preamble — the bridge between this doc's tone and [`14-visual-style-guide.md`](14-visual-style-guide.md)'s exact UI tokens.

**Why it exists.** Many of the slice's images are painted backgrounds that Phaser UI sits *on top of* — the spellbook screen, the calendar/almanac page, the home-hub room. That art straddles both docs. If its palette drifts from the UI tokens, the gold/cream/ink text drawn over it stops reading. So generated art is bound to the same hexes the UI is, expressed as prompt words below.

**Base preamble** — start every asset prompt with this, verbatim:

> Studio Ghibli style, hand-painted watercolor, warm and lively, gently saturated with rich natural color, cozy and whimsical, luminous soft light that fills the room. Warm woods, cream, honey and amber, antique gold, fresh sage and leaf green, soft sky tones. Glowing lamplight and daylight, touches of charming color — potted plants, flowers, warm textiles. Painterly Miyazaki warmth and wonder. No neon, no harsh photographic detail, no muddy darkness.

**Tone lifted 2026-08-22 (Roc).** The first wording (desaturated, quietly melancholic, brown-black backgrounds, no bright color) pulled interiors muddy and uninviting. The lively version above replaced it and tested markedly better — warmer, more inviting. This lifts the **visual** saturation only. The story's quietly-melancholic emotional register (the Frieren discipline under Tone, above) is unchanged — Ghibli holds both: warm living color over a wistful undercurrent.

The palette still answers to the `14` UI tokens where text sits on the art (keep them in sync if `14` changes): parchment `canvas #e7daba`, ink `#2f2413`, gold accent `#c9a15a`, sage `green #7f9a5a`, cream text `#ece3d2`. Gold stays the one "this is interactive" color — use it sparingly in art so it still reads as special when the UI layers more gold on top.

**Always append these constraints:**
- **Camera:** straight-on or static — the *Myst* living-diorama rule. State it two or three ways ("directly overhead, flat top-down, symmetrical") because generators drift to a 3/4 angle.
- **No UI:** end with "no text, no UI, no buttons, no interface, no menu" — Phaser draws the chrome, not the art.
- **Empty where content will land:** any region the game fills (shelves, book pages, day-panels) must be told to stay bare, listed item by item, and repeated as the last line ("the pages must be blank and unwritten"). Recency gives the final instruction extra weight. One mention and the generator fills it.

**Standing.** Generator output is exploration, then adapted — recolored and cropped against the tokens above, not shipped raw. The Style / Art-Direction Agent below still checks each result for palette drift and silhouette breaks. This preamble makes the first pass land closer, so there's less to fix.

**Applied in:** [`../cast/cast-appearance.md`](../cast/cast-appearance.md) — character looks and ready-to-paste prompts for the 8 souls — and [`../locations/locations-appearance.md`](../locations/locations-appearance.md) — interior backdrops (Tavern, NPC homes). Both build every prompt on the base preamble above.

## The Style / Art-Direction Agent

Owns the visual cohesion contract: the color grammar (bands, not a free wheel) and the silhouette vocabulary, expressed as **machine-checkable rules**. Checks each generated art variant reads as a variant *of* the locked vocabulary, flagging palette drift and silhouette breaks. Generates no final art and sets no story; it names and checks the rules a variant must satisfy.

- *In:* `{ new_assets:[{ asset_id, asset_type }], locked_palette_bands, silhouette_vocabulary, key_art_ref }`
- *Out:* `{ variant_checks:[{ asset_id, status:"PASS|FLAG", rule_violated }], palette_delta }`
- *When:* whenever new visual assets enter the slice. *Gate:* soft: the single review eye signs off flags.

See [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md) for this agent's place in the full roster and token budget.
