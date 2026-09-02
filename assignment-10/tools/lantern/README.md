# Lantern — narrative review tool (milestones 1–2, 4)

Local review tool for the game narrative pipeline. Milestone 1 is Mode A
(graph review); milestone 2 adds play mode — inkjs plays the compiled story,
the graph shows where you are, snapshots let you jump back and take the other
branch. Milestone 4 adds the greybox stage: screen images with region
hotspots (or a text-button fallback), item pickups into a satchel, NPC
presence markers, and exits. Spec: `../../resources/review-tool-spec_draft.md`.

## Run it

```
npm install
npm run dev        # opens on http://localhost:5173
npm test           # vitest suite
npm run build      # type-check + production build
```

On first run the app loads the `fixtures` folder; after that it reopens
whichever folder you last loaded. Type another folder path in the header
(absolute, or relative to this tool) and press Load — it needs a `graph.json`
(and optionally `day.json` and `story.json`) in the pinned v1 shapes. Folders
that loaded successfully collect in the **Recent** dropdown beside the input
(most recent first, last eight, in localStorage).

Two fixture folders ship with the tool:

- `fixtures/` — the **play fixture**: the resolver's own fixture output
  (`graph.json` + `day.json`) plus `story.json`, the resolver's emitted ink
  compiled with inkjs. Regenerate all three by running the resolver's fixture
  build and compiling `out-fixtures/ink/main.ink`.
- `fixtures-review/` — the milestone-1 hand-written graph (richer level view:
  forest cluster, locked screen). No story — graph review only.

## The shell

A fixed navigator on the left (scene rail + HEALTH readout), then two view
hosts: a **centre** pane and a **right** pane. Each host has its own tab strip
listing every view — Dialogue · Level · Stage · Play · Sweep · Variables ·
Assets — and shows whichever one you pick, independently of the other. Put
Dialogue beside Level, or Stage beside Play; the same view can sit in either
pane. The right pane hides with the ✕ on its strip and comes back from the
header. **Focus centre** collapses the navigator and hides the right pane so
the centre fills the width.

Defaults: centre = Dialogue, right = Level. Each pane keeps its own per-view
settings too — one pane can show the level as a constellation while the other
shows it as a tree. Those choices persist, as does re-reading the same folder:
a reload leaves your panes, selection and layouts alone, and only opening a
*different* run folder resets the workspace.

Two gutters resize the shell (drag, or focus and use arrows / Home / End /
Enter to collapse). Each pane keeps a small floor so it can never vanish by
accident; the ceiling is measured off the window, so a wide monitor gives a
wide pane.

**Mode is read off the screen, not off a button.** The tool is in play mode
whenever a Stage or Play view is visible — showing one starts the story, and
hiding the pane that holds it drops back to review.

## What it does

- **Level view** — screens as spatial nodes, in one of three layouts. The
  switch sits at the right of the pane title and is per-pane, so one pane can
  hold a constellation while the other holds a tree.
  - **Constellation** (default) — each location spreads around its
    best-connected screen. Radius is hops from that hub, so distance means
    proximity, not progression: this keeps the level view spatial rather than
    a flow. Each branch owns a wedge of the circle, so a chain of screens
    trails outward in one direction instead of crossing its neighbours. Rings
    widen when crowded, and clusters are placed clear of one another.
  - **Tree** — ranked left to right by hops from the start screen, children
    stacked down, parents centred on their children. This *does* introduce a
    flow axis, which the spatial default deliberately avoids; it is offered as
    a second reading because it shows parent/child structure most plainly.
    Anything the start screen cannot reach roots its own tree below.
  - **List** — every screen as a row: id, name, location, gate, neighbours,
    scene count, review status. The only place to find a screen holding no
    dialogue by name — the scene rail lists only screens that have scenes.

  Locked screens carry a gate badge (archetype + gate id, or the id alone where
  the transcription has not assigned an archetype). On the canvas layouts,
  hover or focus a screen for today's slot fill and item rolls from `day.json`.
  Switching layout re-frames the canvas once; resizing a pane never does, so a
  resize cannot yank your pan.
- **Scene rail** — screens that hold dialogue, each with its scenes beneath.
  Groups start open; the twisty folds one away when a screen carries more
  scenes than you want in view, and which ones you folded is remembered.
- **Scene picker** — the strip of scene cards above the dialogue tree. It folds
  to a single line (`SC-T2-07 · toby · 25 lines · 6 choice`) with the twisty at
  its left, handing the tree back the height the cards were holding. Per-pane
  and remembered, so the centre can fold while the right stays open.
- **Scene view** — Enter or double-click a screen to see its scenes; open a
  scene to see its dialogue tree. Flow runs left to right; a choice node's
  sibling options stack vertically. Conditions and state_actions show as
  mono chips.
- **Variable inspector** — every variable with its readers and writers.
  Click one and its nodes light up.
- **Per-node review** — Approve, Flag (with optional note), and edit-in-place
  on line text, player_line, and option deeds. On the dialogue canvas the
  Approve/Flag controls are NOT on the card — they sit on a toolbar that
  appears above a node on hover or focus, and on the keyboard (`a` / `f` /
  `c`). See **Keyboard**. Writes go through the Vite
  dev-middleware file bridge to `<run folder>/out/`:
  - `approvals.json` — `artifact_id → { status: approved|flagged|edited, note?, timestamp }`.
    Approved and edited both pass the gate; only flagged holds a thing back.
  - `edits.json` — append-only `{ target, old_text, new_text, timestamp }`.
    All four fields are required (the bridge 400s otherwise): the resolver
    replays each patch against the current source text in timestamp order,
    and `old_text` is how a stale patch gets caught. A deed option whose
    spec has no `surface_action` field has no text to patch, so its card is
    not editable — adding the field is authoring, not review.
    Saving an edit also marks the target `edited` in approvals.
  In fixture mode that means `fixtures/out/` (gitignored).
- **Review sweep** — the Sweep view lists only unreviewed and flagged
  artifacts; the checkbox dims reviewed nodes on the canvas.

## Play mode (milestone 2)

Show the **Play** view in either pane (needs `story.json` in the run folder):

- **Play pane** — continue-to-next-line transcript. A spoken option renders
  as its quoted player_line, an unspoken one as its `[bracketed deed]`, both
  straight from the weave; tags are stripped from display.
- **Tag mapping** — the `#screen:` / `#choice:` / `#opt:` / `#id:` tags in
  the inkjs output drive the graph: the current node glows, the visited path
  keeps its trace, everything unvisited dims (hover restores). The graph
  auto-follows the running story into the current screen and scene.
- **Graph beside the story** — put Play in one pane and Dialogue or Level in
  the other, or give Play the whole width (the story keeps running either
  way). Every node offers **Jump** — `j` with the node focused, or the button
  on its hover toolbar (on the dialogue canvas) / on the card (elsewhere):
  screens and
  scenes jump by their `graph.json` ink_address via `ChoosePathString`;
  lines, choices, and options jump to their scene; a gather jumps to its
  labelled gather address.
- **Snapshots** — `story.state.ToJson()` is captured at every choice, the
  moment you pick. The timeline strip lists them; click one to restore —
  you land back at that choice with the other branch open, no replay. The
  visited trace rolls back with it.
- **Seed control** — slot / life / day inputs + Re-roll day. The resolver is
  not wired in yet: for now it reloads `day.json` from the run folder (or
  says so when absent) and re-applies presence to the running story.
- **Day presence** — on start, `day.json`'s morning slot_fill writes the
  `present_<soul>` VARs (the "day-start-resolver" writer role), so gated
  scene options actually appear. Ink runtime errors (e.g. jumping into a
  scene the day never filled) surface in the pane instead of crashing.

Demo in fixture mode: Load `fixtures` → set the right pane to **Play** →
Continue (Day 1 begins) → open T2's scene `SC-T2-01` in the centre and press
its Jump → Continue twice to the choice → pick the quoted line → Continue → a
snapshot chip appears; click it → pick `[leave the bread]` instead → the graph
shows the other branch's trace.

## Greybox stage (milestone 4)

**Stage** is its own view — a full pane showing the current screen (`#screen:`
tag drives it, the same signal that highlights the graph). It fills its pane
and scrolls, so the play options below the image are always reachable. Put
Stage and Play side by side to see both at once.

- **Two render paths.** If `manifest.json` in the run folder names an image
  for the screen (`{ "T2": "images/t2.png" }` — image path only, nothing
  else) and the image loads, the stage renders it with region hotspots: soft
  dashed outlines from the screen_spec regions in `graph.json` (normalized
  0-1 rects). No manifest entry, a broken image, or a null region shape (the
  real-data specs ship null shapes until art exists) → the same interactions
  as a stacked text-button list. The tool never blocks on art.
  Fixture demo: **T2 has an image** (a generated gray placeholder,
  `fixtures/images/t2.png`) — hotspots for the `r_crates` item slot and the
  `r_stall` examinable; **T1 has none** — text-button fallback.
- **Item slots.** A slot is clickable when `day.json` rolled it an item.
  Pickup empties the slot (its `slot_<id>` VAR goes `"empty"` story-side
  too) and the item joins the satchel strip. **Satchel semantics:** the
  satchel is part of the snapshot state — restoring a snapshot rolls
  pickups back and the item returns to its slot; a day re-roll or restart
  is day-start (respawn_rule), so the satchel empties. The fixture day is
  hand-set to roll `wool` for SL-T2-01 so the pickup demos; regenerating
  the resolver fixture may re-roll it.
- **Presence.** NPC markers come from `day.json` slot_fill filtered by the
  current screen + time block. Click Converse to enter the soul's scene via
  the existing jump path. A check mark shows once the scene completed today
  (its gather line — or last line for choiceless scenes — entered the
  visited trace; it rolls back with a snapshot restore). NPC slots have no
  geometry in any spec, so markers render as a strip, not on the image.
- **Exits.** One button per `connects_to` entry (seam-labeled); clicking
  jumps the story to that screen's knot, which updates the stage and the
  graph's current-screen highlight. An exit to a screen not in the graph
  (fixture T1 → F1) renders disabled.
- **Time (stubbed).** "Advance time" cycles morning → midday → evening and
  re-applies `present_<soul>` VARs for the new block. It does **not** touch
  the story's own TimeOfDay LIST, and exits do not consume time — the real
  day loop (moves, day_end) stays with the story until the resolver is
  wired in.

Demo, both paths: Load `fixtures` → set a pane to **Stage** → in the stage press
**Enter Market Row** → the placeholder image renders with dashed hotspots;
pick up the wool (chip joins the satchel), Converse with toby, play the
scene to its gather (✓ appears) → **Go to Town Square** → no manifest
entry, so T1 renders the same interactions as text buttons.

## Keyboard

Tab moves through nodes in reading order. Enter opens (a screen's scenes, a
scene's tree) or starts the edit on a text node. On the dialogue canvas, with a
node focused: `a` approves, `f` flags, `c` clears back to unreviewed, `e` starts
the edit, `j` jumps in play mode. Inside an edit every key is text — Esc
cancels, Ctrl+Enter saves.

The keyboard is the guaranteed path, not a shortcut. Approve and Flag are not on
the dialogue card any more: they were inside its click target and got hit while
dragging or reading. They live on a small toolbar that appears above a node on
hover or focus. Because that toolbar can be invisible, the same verbs must
always be on the keyboard — otherwise a hidden control would mean an
unapprovable node.

## Styling is a placeholder

`src/styles/tokens.css` holds neutral grays and system fonts only. The real
design tokens (`design/tokens.html`) are pending review. Every component
styles itself only through those custom properties, so the approved values
drop into `tokens.css` without touching any component.

## Notes

- The file bridge exists only under `npm run dev`; the built bundle has no
  filesystem access. This is a desk tool — no auth, no deploy.
- The tool writes only its two record files. It never touches `graph.json`,
  `day.json`, or anything generated.

### The live-reload invariant: a reload is not a user action

**Re-reading the same run leaves panes, selection, layouts and viewport exactly
as they were.** This is load-bearing, not a nicety — live reload (SSE) fires on
every file save, so anything a reload resets, it resets constantly while you work.

Two bugs of exactly this shape were caught and fixed before SSE landed: re-loading
a folder used to reset both panes to their defaults, and a layout re-seed used to
re-frame the canvas. Both were harmless when reload was a manual act and would
have been intolerable once it became automatic.

Node positions persist across reload as of sign-off #4 — the older caveat that
drags were discarded no longer applies.

*Moved here from `PAUSED.md` 2026-08-01, where it was carried as a project-level
note. It is a property of this tool, so it belongs with the tool.*

### Interpretations made against the spec (flag if wrong)

1. **Spine order** — lines not referenced by any option (as player_line or
   response slot) form the scene spine in array order; each choice node
   attaches after the spine, then options → responses → gather.
2. **Edit targets** — a spoken option's edit targets its player_line
   `content_id`; an unspoken deed targets `<option_id>.surface_action`.
   The `edited` status lands on the target's base id.
3. **Enter on a leaf node** ("enter opens") opens the in-place edit, since a
   line or option has nothing else to open.
4. **Flag = approve-with-note** — the Flag button prompts for an optional
   note and writes `flagged`, per "Approve-with-note writes flagged".
5. **Jump granularity** — ink can only `ChoosePathString` to knots, stitches,
   and labelled gathers, so weave-interior nodes (lines, choices, options)
   jump to the top of their scene. Screens, scenes, and gathers jump exactly.
6. **Option identity at choice time** — inkjs does not expose the `#opt` tag
   on Choice objects (it arrives on a blank line after the pick), so choices
   are matched back to option ids by their weave text against the graph;
   the post-pick tag line confirms the trace.
7. **Snapshot timing** — the snapshot is taken when a choice is picked (state
   at the choice point, pre-pick), which is what makes restore = "back at the
   choice, other branch open".
8. **Scene completion (conversed-today)** — a scene counts as completed when
   its last choice node's gather line (`GB-<choice_id>-GATHER`) appears in
   the visited trace, or its last line for choiceless scenes. Day re-roll in
   fixture mode does not clear the trace (the trace is the playthrough's,
   and the re-roll itself is stubbed).
9. **Examinable hotspots** — an examinable region click jumps to the
   emitted `<screen>.<examinable_id>` stitch. Exits are always buttons in a
   strip (no exit regions exist in the specs yet); NPC markers are a strip
   for the same reason.
10. **Stage image health is optimistic** — a manifested image renders
    immediately and flips to the text fallback on the img error event.
