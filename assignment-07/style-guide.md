# The Visual Style Guide

The rules every pixel of menu, HUD, and window chrome in this game obeys, and what it costs to put a broken one right.

This is not a mood board. Every hex and every ratio below was measured and shipped before it was written down here, and the defect that forced a rule is named where there was one. The self-correcting loop in `loop/` enforces these rules against real screenshots — a Generator builds a screen, an Evaluator names which rule broke, a Refiner fixes it. This file is what the Evaluator reads.

**The game.** A cozy roguelite point-and-click adventure set in a hand-painted magical village — in the spirit of Outer Wilds, Spiritfarer, and Frieren. The player arrives with no memory of the villagers, the "souls," and learns who they are from how they behave. At the end of each life the bonds are lost: the souls stay, the player's knowledge of them does not. The story runs on ink; the capstone ships from a Phaser build. The interface is diegetic and warm — the spellbook is a real leather book, the satchel is a cloth pouch you carry, the calendar is an open celestial book, and the one accent that ever means "you can act on this" is a warm lantern gold. Read a single screenshot of this game and it should be unmistakable: lamp-lit wood and paper, one gold light, no chrome that looks like a web app.

**Sources.** These rules are extracted from the project's own production docs, not invented for this assignment. `gdd/14-visual-style-guide.md` (referred to below as §14) is the design system — palette tokens, type scale and casing, button families, panels and cards, corner filigree, and the measured contrast ratios. `phaser/src/ui/theme.ts` is the `COLOR` token set exactly as shipped, with the contrast ratios recorded in its header comment. `loop/score.mjs` holds the deduction table the Evaluator scores against. The numbers below are quoted from those files, never guessed.

**Scope.** The menu, HUD, and window-chrome layer only: satchel, save/load, options, spellbook, notebook, the calendar book, HUD buttons, panels, cards, and their filigree. NOT the painted backdrops or the character art — those live under §9 art direction, on the painted-world side of the line, and follow the palette-band-and-silhouette system, not this one.

---

## Constraint 1 — Palette: the token set, and the one gold that means "act"

Every fill, stroke, and text color comes from the `COLOR` token set in `theme.ts`. No raw hex or `0x` literal ever reaches a screen. The tokens carry the meaning; a literal throws it away.

The surface logic is fixed and not interchangeable:

- A **card** — an inspect panel, a save slot, a day page — is light parchment: `canvas` `#e7daba`, gradient stop `canvas2` `#dbcaa2`, border `canvasEdge` `#c3b083`, dark `inkOnCanvas` `#2f2413` text.
- **Chrome** — buttons, bars, the framed boards, the dialogue box — is night and leather: `night` `#14110c`, `panel` `#241c14`, `panelHover` `#2f2519`, `leather` `#4a3520`, `leatherDark` `#2c1f12`.
- The **one accent** that ever signals "interactive" is lantern gold `gold` `#c9a15a`, with `ember` `#e6c583` for hover and active states. Nothing else in the UI is allowed to carry that job. If a second color starts meaning "click here," the language is broken.

**Why the gold is this gold.** It is not generic UI gold. It reads as a lantern in a hand-painted village — one warm light in the dark, the same warmth the whole world is lit by. `theme.ts` names it "the one accent that means interactive," repainted in place on 2026-08-19 to the §14 canonical value so HUD, hotspots, notebook, dialogue, and menu chrome all read from a single source instead of seven scene files each hardcoding `#ffd479`.

**Spell VFX gold is deliberately a different token.** `vfxGold` `#ffd479` and `vfxEmber` `#ff9d5c` hold the pre-repaint gold and are used only by spell-effect cue rows, never by menu chrome. This decoupling is on purpose: it means a menu repaint can never break a spell effect. The darker menu gold actually broke a no-effect cast's weight-parity ruling once, so the VFX gold was split off to keep spell rendering untouched (see `render/vfx/CueTable.ts`). Menu chrome uses `gold`/`ember`; VFX uses `vfxGold`/`vfxEmber`. Crossing them is a defect.

**Maps to:** `token.hardcoded_hex` (§2 palette, recovery cost **2** — a grep-and-replace onto a `COLOR` token), and `palette.off_brand_fill` (§5.2 parchment card, cost **4** — a surface painted the wrong material, e.g. dark `panel` where a light parchment card belongs).

---

## Constraint 2 — Typography and casing

Two type families, from §14's type scale. Titles, item names, and dialogue use the **display** face (`"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`; `theme.ts` ships the engine-safe `Georgia, serif` subset). Buttons, labels, counts, eyebrows, and HUD text use the **mono** face (`ui-monospace, "DejaVu Sans Mono", …, monospace`; shipped subset `monospace`).

Casing is a hard rule, not a style preference:

- **Title Case** for labels and buttons — "Cast Spell," "Resume," "Start Over."
- **UPPERCASE**, tracked +1.5 to +2px, for small kickers and eyebrows only — the field labels like "CARRIED FOR," "COMPONENT," a section eyebrow above a heading.
- **normal case** for screen titles — the Satchel title reads "Satchel," a 40px display line, not "SATCHEL" and not "satchel."

A label rendered lower-case where the convention is Title Case is the single cheapest defect in the game, and the most common. It is invisible to a spellchecker and obvious in a screenshot.

**Maps to:** `type.wrong_case` (§3 type · casing, recovery cost **2** — retype the string; refinable, straight back to the Builder).

---

## Constraint 3 — Legibility: text must clear the AA floor over its own backdrop

Every text-on-background pair must clear the 4.5:1 WCAG AA contrast floor for body text over the surface it actually sits on. This is not assumed — `theme.ts` records the measured ratios in its header, and each was checked at full alpha:

| Pair | Ratio | Where |
|---|---|---|
| `canvas` / `inkOnCanvas` | **10.9:1** | body text on a parchment card |
| `canvas` / `inkSoftOnCanvas` | **4.9:1** | captions/descriptions on parchment — just clears the floor |
| `night` / `gold` | **7.83:1** | gold label on the dark scene |
| `gold` / `onAccent` | **7.70:1** | dark text on a gold-filled button |
| `panel` / `ink` | **14.06:1** | body text on chrome |
| `panel` / `muted` | **6.06:1** | secondary text on chrome |
| `night` / `ember` | **11.37:1** | hover-gold on dark |

The trap is HUD text over the painted backdrops. A gold label that clears 7.83:1 over `night` can wash out entirely over a bright patch of hand-painted sky or a lamp-lit wall — a photograph has no fixed contrast. Any HUD text laid over painted art must sit on a `night` scrim or plaque that restores the measured ratio underneath it. The type is only legible against the plaque, never against whatever the painter put there that day.

**Maps to:** `legibility.contrast` (§3 type · legibility). This is the one rule whose cost **scales**: 2 points of deduction per point of contrast below the 4.5:1 floor, floored at 2 and capped at 6. A subtitle sitting at 4.0:1 and one that is genuinely unreadable do not score the same — the grade is continuous, not pass/fail.

---

## Constraint 4 — Button families and components

There are exactly two button families, both lifted structurally from the shipped VN dialogue system's own buttons (§4) and recolored to lantern gold. HUD chrome uses these families. It never invents a per-screen control — no bare bracket text like `[ Cast ]`, no ad-hoc box drawn for one screen.

- **Primary pill (Choice-style).** The main affirmative action on a dark surface — "Cast," "Resume," a dialogue answer. Fill `panel` (hover `panelHover`), 2px `gold` border at 55% (hover `ember`), **display**-font `cream` text centered, corner radius **18% of the pill's own height** (`VN_METRICS.choiceCornerOfPill`) — a soft rounded rect, not a stadium.
- **Utility pill (Control-style).** Persistent chrome — the Notebook/Calendar/Home/Satchel HUD buttons, Auto/Skip/Log, footer actions. Fill `night` at 90% (hover `panelHover`), 2px `gold` border at 35% idle, **mono**-font `gold` text (hover `ember`), corner radius **30% of the pill's own height** (`VN_METRICS.controlCornerOfPill`) — noticeably rounder than the primary pill.

Both keep the dialogue system's exact alpha and radius math; only the hex values change. That is the point — the buttons the player already touched a hundred times in conversation are the same buttons in the menus, so the interface feels like one made thing rather than a stack of screens.

**Maps to:** `component.wrong_family` (§4 button families, recovery cost **6** — an ad-hoc control has to be rebuilt as a real pill; refinable, but expensive).

---

## Constraint 5 — Panels, cards, and material language

Three surface types, each for a different reason, never swapped for one another (§5):

1. **Framed board** (§5.1) — Save/Load, Options, Spellbook. A dark leather gradient, 2px `leatherDark` border, gold corner filigree, heavy drop shadow. This is for a screen that *is* a menu, with nothing diegetic behind it.
2. **Parchment card** (§5.2) — inspect panels, save slots, a day page in the calendar book. Light `canvas`/`canvas2` gradient, dark `inkOnCanvas` text, `canvasEdge` border. This is content read as "a page." The calendar's day card is a light framed page, not a dark panel.
3. **Diegetic object** (§5.3) — the satchel. Its own leather-and-cloth gradient, **no frame and no filigree.** It is a cloth pouch the character is holding, a thing in the world, not a piece of menu chrome. Frame it or filigree it and it stops being an object and becomes a window.

**Corner filigree marks menu chrome, and only menu chrome.** The gold corner-bracket ornament (§6, shipped as `filigreeCorners()` in `theme.ts` — a right-angle bracket plus a stud at each corner in `gold`) is the visual signal that a surface is a framed board. The satchel gets none of it. A parchment card inside a board gets none of it. Put filigree on the pouch and you have made a category error the loop is built to catch.

**A note on reference defects.** `filigreeCorners()` is deliberately coarser than the hand-drawn SVG in the §14 mockups — the placeholder is flagged, not final. When a screen copies a reference that is itself off-brand, no re-theme can fix it; a human has to rule on the reference first.

**Maps to:** `palette.off_brand_fill` (§5.2, cost **4**), `layout.mismatch` (§5 panels & cards, cost **6** — a panel where the book should be, the wrong surface type entirely; refinable), and `reference.defect` (§5, cost **6** — the copied reference is itself wrong; **structural**, stops the loop for a human).

---

## Constraint 6 — VFX containment and render fidelity

Spell VFX stays inside its own pane. Particles emit at their anchor point — once, at the right coordinate — never at 2× the offset, never bleeding across the whole panel. This is the one class of defect that every mechanical check misses: the code compiles clean, `tsc` is green, `vitest` is green, and the screen is still visibly broken. Only a screenshot catches it.

The canonical example is the empty-state hatch, paid for the hard way on the Satchel build (2026-08-19): Phaser 4's WebGL renderer silently drops the classic `Graphics.setMask()`, so a masked hatch pattern bled unclipped across the entire panel while every test passed. The fix was a generated tile drawn as a `TileSprite` that clips to its own bounds natively (`SatchelScene.ts`'s `ensureHatchTexture()`). The lesson generalizes: a whole family of render bugs lives below the type checker and above the unit test, in the space only a rendered frame can see. That gap is exactly why the loop scores screenshots instead of code.

**Maps to:** `motion.render_bug` (§7 VFX containment, recovery cost **6** — a defect only the screenshot shows; refinable), and `asset.missing` (§9 art, cost **6** — a required painted asset simply does not exist yet, and no re-theme can conjure it; **structural**, stops the loop for a human).

---

## How this is scored

The Evaluator never picks a number. It looks at a rendered screenshot, names which rule above broke, and points at the file and line. The arithmetic lives in code — `loop/score.mjs` — not in a model.

`SCORE = 10 − Σ recovery cost`, floored at 0. The costs are the recovery cost of each finding, not a severity-by-feel: a **2** is a grep-and-replace, a **6** is "rebuild the screen or supply the asset." Legibility scales with how far the text sits below the 4.5:1 AA floor. The **verdict** routes on the *kind* of finding, never the number: a `refinable` miss goes back to the Builder with the reason; a `structural` miss (`asset.missing`, `reference.defect`) stops the loop for a human, because no amount of re-theming can fix it by trying again.

Run `node loop/score.mjs --table` to print the full deduction table, or `--replay all` to score the recorded before/after set. A model judges; code scores.
