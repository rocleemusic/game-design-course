# Spell Cast Sounds

**Maps to:** `OptionsScene` Sound → "Spell Cast Sounds" row — the one **toggle**,
not a slider (default on). **Bus field:** `PlayerSettings.spellCastSoundsEnabled`
(boolean, same pattern as `dropConfirmAlways`/`showHints`).

The chime and rush a cast makes when it lands. Roc's `gdd/10-audio.md` calls this
out as its own feedback channel — it's gameplay confirmation a cast worked, not
ambient decoration, which is why it's a mute switch instead of a gain slider: a
player either wants that confirmation cue or doesn't.

**Belongs here:** the cast-success sting, any per-spell-family variant of it if
the design calls for one later.

**Doesn't belong here:** UI feedback for opening the cast picker itself (→
`sound-effects.md` — that's interface, not a cast landing), ambient magic-adjacent
loops (→ `ambience.md`).

**Proposal note:** when wiring in Stage 3, the call checks this boolean, not a
volume multiply — `if (!PlayerSettings.spellCastSoundsEnabled) return;` before
play, not a 0 gain.
