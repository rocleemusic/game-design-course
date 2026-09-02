# Audio Implementer — the loop's contract

Five stages. Stage 0 runs once. Stages 1-4 repeat — this is a cycle, not a
pipeline that finishes.

## Stage 0 — bootstrap the bus (once, before Stage 1 ever proposes anything)

**Why first.** Every category below routes to a volume the player controls from
`OptionsScene`. Right now nothing does — the sliders are `INERT` and nothing in
`phaser/src/` calls `this.sound`. Proposing sounds before this exists means Stage 3
has nowhere real to plug them in.

**Reads:** `phaser/src/world/PlayerSettings.ts` (the established pattern for a real
setting: `localStorage`-backed module state, `get`/`set` pairs, a `MIN`/`MAX`/
`DEFAULT` per numeric control — copy this pattern, don't invent a new one).
`phaser/src/scenes/OptionsScene.ts`'s `CATEGORIES` Sound block for the four rows and
which are sliders (Music, Sound Effects, Ambience — 0-100, gain) vs. the one toggle
(Spell Cast Sounds — on/off, not a gain).

**Does:** adds one volume field to `PlayerSettings.ts` per category (three numeric,
one boolean, matching the pattern already there), plus the "Mute when window is
hidden" toggle. Adds a small `phaser/src/audio/` module — a single place that wraps
`this.sound.play()`/`this.sound.add()`, reads the right `PlayerSettings` field per
call, and is the only thing in the codebase allowed to touch Phaser's sound API
directly. Load the `audio-and-sound` skill before writing any of it — Phaser 4
changed sound APIs from v3 in places, same trap class as the tint/mask gotchas in
`phaser/dev-notes/`.

Four things the skill surfaces that change how this module has to be built, not
just how it's described:

1. **Phaser has no built-in category volume.** `this.sound.volume` is one global
   knob for every sound in the game. There's no native "bus" to attach a slider
   to — the module has to track each category's setting itself and multiply it
   into the `volume` passed to every `play()`/`add()` call. This is the entire
   reason the module exists instead of scenes calling `this.sound` directly.
2. **`this.sound` is one shared manager across every scene, and a looping sound
   does not stop on its own when the scene changes.** Ambience and Music are
   loops. The module must explicitly stop the outgoing location's loop before
   starting the next one, or loops stack instead of replacing each other.
3. **`pauseOnBlur` (default `true`) already pauses every sound when the tab loses
   focus.** Before building a separate hidden-tab handler for the "Mute when
   window is hidden" toggle, check whether that toggle can just flip
   `this.sound.pauseOnBlur` — likely it can, and a hand-built version would
   duplicate behavior Phaser already gives for free.
4. **Autoplay lock.** Browsers block audio until the player clicks or presses a
   key. Music started on scene boot can silently fail to play if
   `this.sound.locked` is still true at that moment — check it, and if locked,
   queue the play via `this.sound.once('unlocked', () => sound.play())` instead
   of assuming `play()` worked.

**Format: MP3, single file per slot.** OGG Vorbis isn't supported on Safari at
all — a `.ogg`-only sound plays nothing there, silently. MP3 has the broadest
cross-browser support (including Safari/iOS), so it's the one format this seat
asks for. No fallback array, no second file per slot — `staging/`'s naming rule
stays one file, `<slot-id>.mp3`.

**Writes:** the `PlayerSettings.ts` additions, the new `audio/` module, an update to
`OptionsScene.ts` flipping the Sound category's rows from inert display values to
real ones wired to the new settings (this is the one point where this seat edits a
scene file outside its own folder — it owns the Sound category specifically because
nothing else does).

**Human check:** Roc opens Options → Sound in a real build, drags each slider,
flips the toggle, confirms the values persist across a reload (same
`localStorage` pattern the other rows already prove out).

**Runs once.** Re-run only if a category's bus breaks or a fifth category gets
added (see "Adding a category" below).

## Stage 1 — propose

**Reads:** `phaser/src/scenes/*.ts` and `phaser/src/world/` for interactions with no
sound behind them yet (a click with no cue, a screen transition with no sting, a
cast with no chime), `asset-list.json` (don't re-propose a slot already in it,
`proposed` or otherwise), `categories/*.md` for what belongs in each bus.

**Does:** for each candidate interaction, writes one entry to `asset-list.json`
with `status: "proposed"` — see the file's own `$comment` for the schema. Group by
category; an interaction that doesn't cleanly fit one of the four existing
categories is a signal to read "Adding a category," not a reason to force it into
the nearest one.

**Writes:** new entries in `asset-list.json`, `status: "proposed"`.

**Human check:** Roc reads the new `proposed` entries and, per slot, either makes
the sound (drops it in `staging/` when done — see Stage 2) or flips `status` to
`"rejected"` with a one-line `notes` reason. A `proposed` slot with no eventual
`rejected` or `staged` is a stalled loop, not a done one.

## Stage 2 — staging (human-only, no agent action)

Roc drops a finished file into `staging/`, named `<slot-id>.<ext>` matching the
`id` in `asset-list.json`. See `staging/README.md` for the naming rule and accepted
formats. This stage exists in the loop diagram but nothing here reads it — it's the
human half between Stage 1 and Stage 3.

## Stage 3 — wire

**Reads:** every file in `staging/`, matched by filename stem to an `asset-list.json`
`id`. A staged file with no matching `id`, or matching an `id` not in `status:
"proposed"`, is an error — stop and ask, don't guess which slot it belongs to.

**Does:** moves the asset into `phaser/public/audio/<category>/`, writes the
`this.sound`/`audio/` module call at the interaction site named in the slot's
`interaction` field, routed through that category's bus module from Stage 0 —
never a raw `this.sound.play()` that bypasses the volume setting.

**Writes:** the moved asset file, the code change, and the `asset-list.json` entry
updated to `status: "implemented"`, `implementedAt` set to the file:line of the new
call. Deletes the source file from `staging/` — the ledger entry is the permanent
record, the staging copy is not.

**Human check:** Roc triggers the interaction in a real build (or
`phaser/tools/playtest.mjs`) and confirms it's audible, and that the matching
`OptionsScene` slider actually changes its volume.

## Stage 4 — status (on demand, no writes)

Read `asset-list.json`, report counts by `status`, per category. Never modify the
file in this stage — it's a read.

## Adding a category

The four current categories are fixed to `OptionsScene`'s current four Sound rows.
A fifth category needs a fifth row (or a repurposed one) in `OptionsScene.ts` and a
fifth field in `PlayerSettings.ts`, done together — a bus with no slider is a volume
the player can never reach, which defeats the reason this loop routes through buses
at all. Add the category's `.md` file to `categories/` in the same pass.

## Hard constraints

- **Never invent an interaction.** Every proposed slot names a real, already-coded
  place in `phaser/src/` where the trigger fires. If you can't point to the file and
  line, it isn't a proposal yet.
- **Never bypass the bus.** Every `wire` call goes through the Stage-0 audio module,
  never a direct `this.sound.play()`. That module is what makes the OptionsScene
  sliders real instead of decorative a second time.
- **Never delete a staged file before its ledger entry reads `implemented`.** If the
  wire step fails partway, the file stays in `staging/` and the ledger entry stays
  `proposed` — the loop retries, it doesn't lose the asset.
- **One home for status.** `asset-list.json` is the only status ledger. Don't keep a
  second running tally anywhere else in this folder.
