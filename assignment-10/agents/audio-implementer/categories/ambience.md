# Ambience (Forest & Town)

**Maps to:** `OptionsScene` Sound → "Forest & Town Ambience" row (slider, 0-100).
**Bus field:** `PlayerSettings.ambienceVolume`.

The bed of forest and town sound that sits under each place — see
`gdd/10-audio.md`: field-recording/foley-grounded, distinct from Music's
melodic/scored identity.

**Belongs here:** per-location looping beds (forest, town square, interior),
weather layers, time-of-day shifts if any exist.

**Doesn't belong here:** anything melodic or thematic (→ `music.md`), one-shot
triggered sounds even if environmental in flavor, like a door creak on open (→
`sound-effects.md` — ambience is loops, not events).

**Proposal note:** one slot per location is the expected grain, not one per
screen state within a location.
