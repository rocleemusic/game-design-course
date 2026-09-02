# remove-background

Cut a backdrop out of AI-generated art (cast portraits, item icons, spell/VFX cards) so it drops into the game as a clean transparent PNG. Runs through Blender's Python via blender-mcp — no external image tools needed.

## First: pick the right method

**Is the art's edge hard, or does it fade into the backdrop?**

| Edge type | Examples this session | Method |
|---|---|---|
| Hard edge — solid object, clean silhouette, deckled/torn paper edge | cast portraits, item icons, framed spell cards | **Flood-fill** — `tools/remove-background.py`, one backdrop image, done in one pass |
| Soft edge — glow, smoke, sparkle, anything meant to fade to nothing | spell VFX icons (glow orbs, smoke wisps, fire haze) rendered directly on a flat backdrop | **Two-background matte** — needs a second regenerate, see below |

Guessing wrong costs real time — flood-fill on a soft-glow image either crushes the glow to a hard edge or leaves visible backdrop-color fringe no amount of despill math fully removes. If in doubt, look at the source: does anything in the art visibly blend into the backdrop color before it goes fully transparent? If yes, it's soft-edge.

## Hard edge: flood-fill

Run `tools/remove-background.py` via blender-mcp (`mcp__blender__execute_blender_code`). Edit `SRC_DIR` and the `FILES` dict (filename → `thresh`) at the top, or exec the file's function definitions and drive it inline for a one-off batch — both patterns were used this session.

- Start `thresh` around 0.03, tune per file. Full tuning notes (what a too-low vs too-high threshold looks like) are in the script's header comment.
- **Always check `no-bg/_preview/<file>.png`** (a checker-composite the script generates automatically) before trusting a cutout. Claude's `Read` tool renders raw RGB and ignores alpha — a fully-broken cutout can look perfect in a plain preview.
- For a whole batch, build a contact sheet (numpy grid of the checker previews, one `Read` call) instead of reading each file individually — faster to eyeball 16 at once. Remember Blender's pixel buffer is bottom-to-top; flip rows when assembling the grid or thumbnails land upside down.

### When flood-fill won't fully clean up: a stubborn color band

Flood-fill walks inward from the border and stops at the first hard local edge — usually correct. But if the art has a **second color band between the backdrop and the real content** (e.g. a light rim/highlight hugging a card's deckled edge, a different shade from the flat backdrop), flood-fill stops at the *first* boundary and leaves that band opaque, and you often can't fix it by raising `thresh` — the deckled/torn edge is irregular, so a threshold high enough to bridge the band leaks through the ragged edge somewhere else on the perimeter and eats real content instead.

Diagnose by sampling raw pixel values across the boundary (not the smoothed 5px-apart kind — check adjacent single pixels) to find the actual local jump sizes. If there are two distinct jumps and no threshold value sits safely between them everywhere on the perimeter, don't fight it with `thresh`. Instead add a **second, hue-based cleanup pass** after the flood: any pixel still classified foreground that's close in hue to the sampled backdrop color (e.g. `G > R + margin and G > B + margin` for a green backdrop) gets reclassified as background too, regardless of connectivity. This targets the leftover band by color, not by flood connectivity, and leaves real art content (different hue family) untouched.

## Soft edge: two-background matte

Single-backdrop keying cannot correctly separate "translucent glow" from "backdrop bleeding through" — there's no way to recover true color and opacity from one flattened composite. Chasing it with despill tuning (tried: channel suppression, alpha-gated subtraction, full division-based unmix) produces either visible backdrop-color fringe or, if pushed harder, magenta/hue-inversion artifacts from amplifying JPEG noise. Don't spend time re-deriving this — go straight to a second backdrop.

**1. Get a second render on a different backdrop**, ideally black. Reuse the same generation thread/context so composition matches as closely as possible — there's no seed lock available through the browser UI, so expect minor drift and spot-check alignment before trusting the batch. Prompt template that worked:

> Regenerate that exact image, unchanged in every way — same pose, composition, colors, and style — but swap the background to solid pure black (#000000) instead of green. Nothing else should change.

**2. Solve for true color and alpha directly** (classic two-backdrop/difference matting — no more guessing):

```
diff_bg = bg1 - bg2                    # backdrop colors, sampled from corners of each image
diff_C  = C1 - C2                      # per-pixel, the two renders (align/resize to match first)
alpha   = 1 - clip(dot(diff_C, diff_bg) / dot(diff_bg, diff_bg), 0, 1)
fg      = clip(C2 / max(alpha, floor), 0, 1)   # trivial when bg2 is black: fg = C2 / alpha
```

This is dramatically better than any single-backdrop despill — verified this session on 16 spell-VFX icons, went from visible green rings/fringe on every soft edge to zero fringe, no ghosting, real translucency preserved.

**Known follow-up issues, both diagnosed and fixed this session — check for them:**
- **Background grain wash on the output.** The JPEG noise floor near-zero alpha varies *per image* — a fixed cleanup threshold that works on one file can amplify noise into visible fake opacity on another (happened on `portion.jpg`: a solid black wedge of "opaque nothing" in a corner that should've been empty). Fix: measure each image's own noise floor from its border region, set the cleanup threshold adaptively (e.g. `noise_p99 * 1.3` to `noise_p99 * 3.0`), not a hardcoded number.
- **Dark rings around bright glow orbs.** If content was rendered with additive/screen blending rather than standard alpha compositing, the linear over-blend assumption underestimates alpha in the falloff — recognizable as a visible dark ring between a bright core and the transparent field, even though the recovered color is otherwise correct. Fix: add a second alpha estimate from the black-backdrop image's own brightness (`smoothstep` on `max(R,G,B)` of the black-bg render) and take the max of the two alpha estimates. **But verify against the raw black-backdrop source before assuming this is a bug** — on `glimmer.jpg` this session, the "ring" turned out to be genuinely painted into the source art (visible in the raw unprocessed black-backdrop file), not a matting artifact. No amount of processing fixes content that's actually there; that needs a source regenerate, not more math.

## Verification, every time

1. Composite the RGBA output over a checkerboard (or two contrasting solid colors, e.g. black and white) and `Read` *that*, never the raw cutout — alpha doesn't render in a plain preview.
2. For a batch, build one contact-sheet grid instead of reading each file — faster, and easier to spot the one bad file among many.
3. If something still looks wrong after processing, sample actual pixel values (not just eyeball the preview) before changing the algorithm — most of this session's real bugs (the iteration-cap bug, the noise-floor bug, the additive-blend bug) were only findable by comparing raw numbers, not by staring at a thumbnail.

## Reference

- Flood-fill script: `tools/remove-background.py` (has the full threshold-tuning guide in its header comment)
- Two-background matte: no standalone script yet — built inline in Blender each time this session. If this becomes a recurring need, promote it to a script here following the same pattern as `remove-background.py` (a new image datablock for the alpha-bearing save, checker preview alongside every output).
