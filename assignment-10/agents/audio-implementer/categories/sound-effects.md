# Sound Effects

**Maps to:** `OptionsScene` Sound → "Sound Effects" row (slider, 0-100). **Bus
field:** `PlayerSettings.sfxVolume`.

Foley for foraging, moving through a screen, and the small clicks of the
interface — this is the catch-all bus for UI and interaction sound. There is no
separate UI category; UI clicks, hovers, confirms, and errors route here.

**Belongs here:** button clicks, menu open/close, drag-and-drop pickup/drop,
inventory sounds, error/invalid-action cues, foraging foley.

**Doesn't belong here:** looping environmental beds (→ `ambience.md`), spell casts
(→ `spell-cast-sounds.md`, its own toggle because it's a distinct gameplay
feedback channel, not decoration), music (→ `music.md`).

**Proposal note:** this is the highest-volume category — expect the most slots.
Propose in small batches per screen/scene rather than the whole game at once, so
a `proposed` batch stays reviewable.
