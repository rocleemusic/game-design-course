# Visual Style Guide

The UI design system for the Phaser build's menu and panel screens — palette, type, shape language, and every reusable component, derived from the four approved mockups (`phaser/tools/screen-flow/mockups/`) reconciled against what's actually shipped (`phaser/src/ui/theme.ts`, `phaser/src/systems/DialogueSystem.ts` + `DialogueLayout.ts`). Companion reference: [`design-system.html`](../phaser/tools/screen-flow/mockups/design-system.html) — a live page with every token and component rendered, for review in a browser rather than read as CSS.

This covers the **menu/panel layer** (satchel, save/load, options, spellbook, notebook, HUD chrome) — not the painted backdrops or character art, which stay under [`09-art-direction.md`](09-art-direction.md)'s palette-bands-and-silhouette system.

## The one reconciliation this doc makes

The mockups (Round 3–5, 2026-08-18/19) and the shipped `theme.ts`/dialogue system disagree on gold: the mockups use a muted antique gold (`#c9a15a` / `#e6c583` bright), the shipped theme uses a brighter lantern gold (`#ffd479` / `#ff9d5c` ember). **Ruled (Roc, 2026-08-19): the mockup gold is canonical. Button shape and behavior follow the shipped dialogue pills, recolored.** Every other mockup token (leather, canvas/parchment, ink) already matched `theme.ts` closely enough that no second call was needed there. See "Migration notes" at the end for what this means for code already shipped on the old gold.

---

## 1. Palette

| Token | Hex | Role |
|---|---|---|
| `night` / `forest` | `#14110c` | Page/scene background — already identical between theme and mockups |
| `forest2` | `#1d2018` | Backdrop gradient midpoint (satchel only) |
| `forest3` | `#0c0a07` | Backdrop gradient's darkest stop |
| `panel` | `#241c14` | HUD chrome fill — buttons, bars, the dialogue box |
| `panelHover` | `#2f2519` | `panel`, lifted — hover/lit state |
| `leather` | `#4a3520` | Mid-tone leather (satchel pouch body) |
| `leatherDark` | `#2c1f12` | Board borders, pocket-tile stroke, flap/clasp |
| `leatherLight` | `#6f5030` | Leather gradient's lit edge |
| `canvas` | `#e7daba` | Parchment surface — inspect cards, help panels, save slots |
| `canvas2` | `#dbcaa2` | Parchment gradient's darker stop |
| `canvasEdge` | `#c3b083` | Parchment border/divider |
| `stitch` | `#b79a63` | Stitched-cloth accent (pockets, chip borders) |
| `pocket` | `#c9b78d` | Satchel cloth-pocket fill |
| `ink` (dark-on-light) | `#2f2413` | Body text ON `canvas`/parchment |
| `inkSoft` | `#6b5836` | Secondary text on parchment (descriptions, captions) |
| `cream` (light-on-dark) | `#ece3d2` | Body text ON `night`/`leather`/`panel` |
| `dim` | `#b0a184` | Secondary text on dark surfaces, disabled labels |
| **`gold`** | **`#c9a15a`** | **The one accent that means "interactive." Mockup value — canonical (see above)** |
| **`goldBright`** | **`#e6c583`** | Hover/active gold |
| `green` | `#7f9a5a` | Confirmed / known / toggle-on |
| `rust` | `#7a4a2a` | Destructive text (idle) — `.act.warn` in the save-load mockup |
| `rustBright` | `#9c5a34` | Destructive hover |
| `success` | `#9fd7a0` | *(from `theme.ts`, unchanged — no mockup defines a success color)* |
| `danger` | `#e2836b` | *(from `theme.ts`, unchanged — distinct from `rust`; `danger` is a failed/blocked action, `rust` is a deliberate destructive one)* |

`night`/`forest`, `panel`, `leatherDark`, `canvas`, and `ink` are unchanged from `theme.ts` — only the gold pair actually moves.

## 2. Typography

> **RULED 2026-08-29 (Roc): serif everywhere.** The two-family split below is
> retired. Every label — titles, prose, buttons, tabs, chips, counts, eyebrows,
> HUD header and pills — uses the **Display (serif)** face. The mono/data face
> is gone from the UI; Roc reads mono chrome as a font mismatch. `theme.ts`
> enforces this by pointing `FONT.mono` at the serif stack, so existing
> `FONT.mono` call sites render serif without a per-site sweep, and the decision
> reverts from one line. `playtest/t6f-font-consistency*.mjs` guards it (asserts
> no Text on any non-serif family). The table below is kept as the record of the
> old rule; only the Display row is now in force.

| Role | Stack | Used for |
|---|---|---|
| Display | `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` | **Everything** (was: titles, item names, dialogue/choice text, descriptions) |
| ~~Mono (data/UI)~~ *(retired 2026-08-29)* | `ui-monospace, "DejaVu Sans Mono", "SF Mono", Menlo, monospace` | ~~Buttons, labels, counts, eyebrows, HUD text~~ — now serif |

`theme.ts`'s `FONT.display` (`"Georgia, serif"`) is the bare, engine-safe subset of the Display stack — it degrades to exactly that if the richer faces aren't available, so adopting the fuller stack in `theme.ts` is a free upgrade, not a behavior change. `FONT.mono` now equals `FONT.display` (see the ruling above).

**Type scale** (as observed across the four mockups, consolidated):

| Size | Weight/case | Use |
|---|---|---|
| 40px display | 600, normal case | Screen title (Satchel) |
| 34–36px display | 600, some uppercase+tracked | Board title (Save/Load), item detail name |
| 24–26px display | 600 | Section heading, rail title (Options), page heading (Spellbook) |
| 16–18px display | 400, italic for description | Body text, descriptions |
| 13–15px mono | 400 | Data rows, button labels, chip text |
| 10.5–13px mono | 400, uppercase, +1.5–2px tracking | Eyebrows, field kickers ("CARRIED FOR", "COMPONENT") |

**Capitalization (RULED 2026-08-29, Roc).** Two rules by text type, enforced at the RENDER layer via `phaser/src/util/text.ts` (`titleCase` / `sentenceCase`) — never by editing record ids or content:

- **Names → Title Case (every word):** item names, spell phrases (including the spoken "you say …" incantation and the Cast button), examinable names, soul names, and time-of-day (Morning / Afternoon / Evening / Night).
- **Captions / counts / hints → first letter only:** "12 Facts learned", "3 Souls met", "The way is blocked", "Banked pieces left to place".

Item and spell names carry no `name` field — the display name is derived from the id (strip `item_`/`key_`, `_`→space) and Title-Cased at render. Guarded by `phaser/playtest/capitalization.mjs` + `phaser/tests/text.test.ts`.

## 3. Shape language

| Element | Radius | Border | Shadow |
|---|---|---|---|
| Framed board (Save/Load, Options, Spellbook) | 16px (12px on inner cards) | 2px `leatherDark` | `0 24px 60px rgba(0,0,0,.55)` |
| Card (parchment/canvas) | 12px | 2px `canvasEdge` | `0 8px 20px rgba(0,0,0,.4)` |
| Tile (satchel pocket) | 0 (square, cloth-cut) | 1px `leatherDark`, 3px `gold` when selected | — |
| Chip / badge | fully rounded (pill) | 1px `stitch` | — |
| Button | see §4 — **not** a flat radius; follows the dialogue pill formula | — | — |

## 4. Buttons

Two families, both lifted structurally from the **shipped VN dialogue system** (`DialogueSystem.ts`'s `drawChoices()`/`drawControlBar()`, geometry in `DialogueLayout.ts`'s `VN_METRICS`) — the actual buttons under the dialogue panel — recolored to the mockup gold. This replaces the mockups' own flat-8px-radius button CSS; the mockups got the palette and panel language right, the dialogue system already had the correct button shape and it should not be reinvented per screen.

### Primary pill (Choice-style)
The main affirmative action on a dark surface — "Cast", "Resume", a dialogue answer.

- Fill: `panel` `#241c14` @ 94% · hover: `panelHover` `#2f2519` @ 94%
- Border: 2px, `gold` @ 55% · hover: `goldBright` @ 55%
- Text: `cream` (enabled) / `dim` (disabled) — **display** font, centered
- Corner radius: **18% of the pill's own height** (`VN_METRICS.choiceCornerOfPill`) — a soft rounded rect, not a stadium
- Disabled: border alpha drops to 25%, fill unchanged

### Utility pill (Control-style)
Persistent chrome — Notebook/Calendar/Home/Satchel HUD buttons, Auto/Skip/Log/Hide UI/Options, footer actions ("close — Esc", tabs).

- Fill: `night` @ 90% (idle) · hover/active: `panelHover` @ 90%
- Border: 2px, `gold` @ 35% (idle) · hover/active: `goldBright` @ 90%
- Text: `gold` (idle) / `goldBright` (hover/active) — **mono** font, centered
- Corner radius: **30% of the pill's own height** (`VN_METRICS.controlCornerOfPill`) — noticeably rounder than the primary pill

**Close control — one language (RULED 2026-08-29, Roc).** Every framed screen closes with the SAME bottom-right utility pill, labeled **"[ Close — Esc ]"** — satchel, spellbook/notebook, calendar, and Options (Options' old "Done" was renamed to "Close"). The NPC modal's close reads "Close". No screen keeps a bottom-left "Esc or N/L to close" text hint.

### On-canvas button (new — parchment context)
Neither dialogue button variant sits on parchment; the mockups needed one (save-slot actions, options' "reset category"). Same two-tier logic, flipped for a light surface:

- Fill: transparent · hover: `gold` @ 18–34%
- Border: 1px `stitch` · hover: `gold`
- Text: `ink` — mono font, centered
- **Warn modifier** (destructive — "Start over"): text `rust`, hover border `rustBright`, hover fill `rgba(150,70,40,.14)`

Both dark-surface pills keep the dialogue system's exact alpha/radius math — only the hex values change. A future engine change to `VN_METRICS` should be treated as changing this spec too, not drifting from it silently.

## 5. Panels & cards

Three surface types, used for different reasons — not interchangeable:

1. **Framed board** — Save/Load, Options, Spellbook. Dark leather gradient, 2px `leatherDark` border, gold corner filigree (§6), heavy drop shadow. For a screen that IS a menu — nothing diegetic behind it.
2. **Parchment card** — inspect panels, save slots, options' help pane. Light `canvas`/`canvas2` gradient, `ink` text, `canvasEdge` border. For content read as "a page," inside or beside a framed board.
3. **Diegetic object** — the satchel pouch. Its own leather gradient, **no filigree, no frame** — it is a thing in the world, not a menu chrome piece. Use this only when the screen literally is an object the character is holding.

## 6. Corner filigree

Gold corner-bracket ornament marking a framed board as menu chrome. Two implementations exist and should converge:

- **Mockups**: a hand-drawn SVG symbol (`#fil`), reused via `<use>` in all four corners, rotated/mirrored per corner.
- **Shipped**: `theme.ts`'s `filigreeCorners()` — a simpler Graphics-drawn right-angle-bracket-plus-stud, already mounted on every `ModalFrame` modal.

The shipped version is coarser than the mockups' hand-drawn one. Not reconciled in this pass — flagged the same way the icon situation was (§9): the mockups' SVG is the target fidelity, `filigreeCorners()` is the placeholder until someone ports it the way Satchel's material icons were ported (real SVG files, loaded, not redrawn — `phaser/src/scenes/SatchelScene.ts`'s header has the technique).

## 7. Tabs

Satchel's Satchel/Arms tabs, Options' category rail. Active: `gold` fill, `panel`-dark (near-`onAccent`) text. Inactive: `dim` or `gold`-at-lower-emphasis text on transparent, `panelHover` on hover. Options' rail variant adds a 2px left border in `goldBright` on the active item instead of a filled pill — acceptable variation for a vertical list vs. a horizontal tab row.

## 8. Tiles, badges, chips

- **Grid tile** (satchel pocket): square, `pocket` cloth fill, 1px `leatherDark` border (3px `gold` selected). Empty tile: diagonal hatch (§10), not a flat color — reads as "nothing here" rather than "broken."
- **Count badge**: small dark pill anchored to a tile's corner, `leatherDark` fill, `gold` text. A `free` item gets the word "free" instead of a number — never a fabricated count (`phaser/src/world/SatchelPockets.ts`'s own rule).
- **Chip** ("carried for" spell tags, item components): fully-rounded pill, `stitch`-bordered. Neutral: `gold`-tinted fill @ ~18–22%, `ink` text. Known/confirmed state: `green`-tinted fill instead — the one place `green` appears outside the toggle control.

## 9. Sliders, toggles, segmented control

From the Options mockup — not yet built in Phaser, specified here for whoever ports Options next:

- **Slider**: 8px track, `gold` fill up to the value, `#3a2c18`-ish dark remainder, `goldBright` circular thumb with a dark ring.
- **Toggle**: pill switch, `green` fill when on / dark when off, cream thumb sliding between the two ends.
- **Segmented control**: bordered row of text options, active segment gets a `gold` fill with dark text; inactive segments sit plain.

## 10. Empty-state hatch

A 45°-diagonal repeating stripe (`leather`/`leatherDark`-ish two-tone), used wherever a slot has nothing in it — empty satchel pocket, empty save slot.

**Implementation note, paid for the hard way (Satchel build, 2026-08-19):** Phaser 4's WebGL renderer does not support the classic `Graphics.setMask()` — it warns and silently fails, so a masked hatch pattern bleeds unclipped across the whole panel. The correct technique is a small tile generated once via `Graphics.generateTexture()` and drawn as a `TileSprite`, which repeats and clips to its own bounds natively. See `SatchelScene.ts`'s `ensureHatchTexture()` for the working version — reuse it, don't re-derive the masking approach.

## 11. Iconography

Hand-drawn single-color-family SVGs, one per material/concept — not the gold icon kit (`~/Desktop/assets/ui-icons`), which is teal-backed and not exported to individual transparent files yet. Six exist today (satchel materials: stone, sound, wax, feather, wool, sticks — `phaser/public/art/ui/satchel/*.svg`), pulled verbatim from the mockups' inline `ART` object and loaded via Phaser's real `load.svg()`, not redrawn as Graphics primitives. Anything without a bespoke icon falls back to a plain dusk-and-gold Graphics dot (`leaf` in `SatchelScene.ts`) rather than a missing-art hole. New icons should follow the same path: draw the SVG once (by hand or exported from the kit once that's available), save it as its own file, load it — never inline raw SVG markup into Phaser code, which cannot parse live path data (`load.svg` rasterizes a file at load time).

---

## Migration notes — what this doc changes vs. what's already shipped

- **The gold repaint shipped in place — RULED 2026-08-19.** `theme.ts`'s `gold`/`goldNum`/`ember`/`emberNum`/`border` were repainted to the canonical values (`gold` `#c9a15a`, `ember` `#e6c583`), not added as a second token family. Seven scene files that hardcoded the old `#ffd479` were swept onto the `COLOR` tokens, so `SatchelScene` and every other gold-accented element (HUD buttons, hotspot markers, notebook tabs) now reads canonical — no separate recolor pass needed.
- **Spell VFX was decoupled from the menu gold — RULED 2026-08-19.** New `theme.ts` tokens `vfxGold` (`#ffd479`) / `vfxEmber` (`#ff9d5c`) hold the pre-repaint gold for the spell-VFX cue rows only. Why: the darker menu gold broke the no-effect `cueWeight`/`neutralFor` parity ruling — a gold tint's no-effect twin fell below the 95% floor and `neutralFor` returned null. Menu chrome uses `gold`/`ember`; the VFX cue rows use `vfxGold`/`vfxEmber` (see `render/vfx/CueTable.ts` and `cues.json`).
- **`filigreeCorners()`** is coarser than the mockups' hand-drawn corner SVG (§6) — same "port the real art" work the material icons already went through, not yet done for filigree.

## Related, not duplicated here

- [`09-art-direction.md`](09-art-direction.md) — backdrop/character art palette bands and silhouette vocabulary. This doc is UI chrome; that one is the painted world.
- `phaser/src/ui/theme.ts` — the implementation source of truth for whatever this doc rules; keep them in sync when one changes.
- `phaser/src/systems/DialogueSystem.ts` / `phaser/src/world/view/DialogueLayout.ts` — the button geometry this doc's §4 is a spec *of*, not a reinvention.
