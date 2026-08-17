# `toby-the-shelf` C1 — `SC-T2-08` — lines

**Conversation:** C1, first contact. Carries R1 (the shelf of unopened jars exists).
**Structure source:** `../toby-the-shelf.md`, section "C1 — `SC-T2-08`" (approved by Roc 2026-08-06). Nothing structural changed here.
**Incoming states:** one (zero knowledge). No per-state variants exist for this conversation; node 4 and its child gate on `shelf_seen`, which is set inside this same conversation, so the only walk difference is asked-about-the-jars versus not.
**Scene register:** `matter_of_fact` is the scene lock. Per-slot tones are recorded below as instructed; see the note at the foot of this file.
**Speaker for all `dialogue` slots:** `toby`. All non-dialogue slots are rendered `[action]` per the card's rendering convention.

---

## `CH-T2-08-1` — first contact, counter mid-order, jar shelf in view

| Slot id | slot_type | tone | Text | speaker_intent |
|---|---|---|---|---|
| `L-CH-T2-08-1-setup` | action | matter_of_fact | **[action]** Toby splits an order across two boards without stopping. Behind him a shelf of jars, ribbon still on some, none opened. | — |
| `L-CH-T2-08-1-a-p` | player_line | matter_of_fact | What are all the jars for? *(6)* | — |
| `L-CH-T2-08-1-a-r1` | dialogue | matter_of_fact | Thank-yous. Jam, mostly. *(4)* | Names the surface of the shelf and nothing under it; the fact is cheap, the reason is not on offer. |
| `L-CH-T2-08-1-a-r2` | dialogue | matter_of_fact | Pass me the small board while you're stood there. *(9)* | Attention started to turn on him, so he hands it a job to land on instead. |
| `L-CH-T2-08-1-b` | surface_action | matter_of_fact | **[action]** [Hold the sack open while he loads it] | — |
| `L-CH-T2-08-1-b-r1` | dialogue | warm | Two more and it's done. Take the short handle, the other one bites. *(13)* | Accepts the help by immediately supplying the helper with what they will need next; the exchange is levelled before it can sit as a favour. |
| `L-CH-T2-08-1-c-p` | player_line | matter_of_fact | Big order, this early. *(4)* | — |
| `L-CH-T2-08-1-c-r1` | dialogue | matter_of_fact | Twelve for the Hallow house, out by noon. It'll hold. *(11)* | Answers the count exactly because the count is the easy part; the load is converted into a schedule that is already solved. |

Records per graph: `-a` sets `shelf_seen` and moves `toby-the-shelf`; `-b` records Intimacy; `-c` records nothing.

---

## `CH-T2-08-2` — the order work continues

| Slot id | slot_type | tone | Text | speaker_intent |
|---|---|---|---|---|
| `L-CH-T2-08-2-setup` | dialogue | matter_of_fact | Trays are still coming. Mind the rail, it's hot from the first bake. *(13)* | Warns before being asked; the room is being made safe for whoever is standing in it. |
| `L-CH-T2-08-2-a` | surface_action | matter_of_fact | **[action]** [Lift the next tray off the rack and set it by him] | — |
| `L-CH-T2-08-2-a-r1` | dialogue | quiet | That's the one. *(3)* | Flat because the help arrived before he could ask, which puts the attention back on him. |
| `L-CH-T2-08-2-a-r2` | dialogue | warm | There's water by your elbow. Cold since this morning. *(9)* | Turns the help around inside two lines; being given to is settled by giving back, so nothing is left owed. |
| `L-CH-T2-08-2-b-p` | player_line | matter_of_fact | Who's the order for? *(4)* | — |
| `L-CH-T2-08-2-b-r1` | dialogue | matter_of_fact | Hallow house. Six of them, two won't touch rye. Four rye, four white, four seed. *(15)* | He has the household's needs counted out without being asked to; exactness about other people is where he is fluent. |

Records per graph: `-a` Intimacy, `-b` Trust. `precision_profile` is referenced here, not a fact slot.

---

## `CH-T2-08-3` — the needed thing is already set out

| Slot id | slot_type | tone | Text | speaker_intent |
|---|---|---|---|---|
| `L-CH-T2-08-3-setup` | action | matter_of_fact | **[action]** The cloth the player is about to reach for is already folded on the counter's near edge, within arm's length. Toby has not looked up. | — |
| `L-CH-T2-08-3-a-p` | player_line | matter_of_fact | That was out before I needed it. *(7)* | — |
| `L-CH-T2-08-3-a-r1` | dialogue | quiet | It was going spare. *(4)* | Names the act as an accident of stock so it cannot be read as done for anyone. |
| `L-CH-T2-08-3-a-r2` | dialogue | warm | Use it on the hot side. Saves your hands. *(9)* | Even while ducking the notice he is still supplying; the care does not switch off, it just stops being visible as care. |
| `L-CH-T2-08-3-b` | surface_action | matter_of_fact | **[action]** [Take the cloth and keep the counter moving] | — |
| `L-CH-T2-08-3-b-r1` | dialogue | matter_of_fact | Good. Next one's out in a minute, mind the edge. *(10)* | The habit passing unremarked is the outcome he wants; he answers by pointing at the next thing. |

Records per graph: `-a` Trust, `-b` Intimacy. `warmth_channel` staged as business, referenced, no fact slot.

---

## `CH-T2-08-4` — the shelf acknowledged *(gated `knows(shelf_seen)`)*

Gate false: node auto-skips to its gather. No alternate content is authored, per the content block.

| Slot id | slot_type | tone | Text | speaker_intent |
|---|---|---|---|---|
| `L-CH-T2-08-4-setup` | action | quiet | **[action]** The player's eye goes back to the jars. Toby follows it, stops, then reaches past for the flour scoop and starts on a sack that did not need shifting yet. | — |
| `L-CH-T2-08-4-a-p` | player_line | quiet | None of them are open. *(5)* | — |
| `L-CH-T2-08-4-a-r1` | dialogue | quiet | No. Haven't got to them. *(5)* | Confirms the fact plainly and offers nothing behind it; short because the attention is on him, not because he has closed. |
| `L-CH-T2-08-4-a-r2` | dialogue | quiet | Sack wants shifting before the ovens come up. *(8)* | Distress rerouted into a job; the task is real, the timing is not. |
| `L-CH-T2-08-4-b` | surface_action | matter_of_fact | **[action]** [Take the other end of the sack and turn back to the order with him] | — |
| `L-CH-T2-08-4-b-r1` | dialogue | matter_of_fact | Right. Two trays and the crate and we're clear. *(10)* | Handed his cover back, he takes it gratefully and is instantly quick again; the tempo returning is the whole tell. |

Records per graph: `-a` Recognition, then enters the nested node. `-b` Intimacy.

---

## `CH-T2-08-4-a-1` — mid-deflection he supplies the player something anyway *(nested inside `-4-a`)*

| Slot id | slot_type | tone | Text | speaker_intent |
|---|---|---|---|---|
| `L-CH-T2-08-4-a-1-setup` | action | quiet | **[action]** Still talking about the sack, still not looking up, he sets a warm roll on the board by the player's hand. | — |
| `L-CH-T2-08-4-a-1-a-p` | player_line | quiet | You just did it again. *(5)* | — |
| `L-CH-T2-08-4-a-1-a-r1` | dialogue | quiet | Did what. It'd go stale by evening. *(7)* | Mislabels the gift as waste management so no thanks can attach to it. |
| `L-CH-T2-08-4-a-1-a-r2` | dialogue | warm | Eat it warm, it's better warm. *(6)* | The naming did not stop the giving; he answers the observation with more of the thing observed. |
| `L-CH-T2-08-4-a-1-b` | surface_action | matter_of_fact | **[action]** [Take the roll and say nothing] | — |
| `L-CH-T2-08-4-a-1-b-r1` | dialogue | warm | There's more of those when that's gone. *(8)* | Unremarked giving is the safe kind, so he immediately offers the next one. |

Records per graph: `-a` moves `toby-the-shelf`; `-b` Intimacy.

---

## `CH-T2-08-5` — leave-taking

| Slot id | slot_type | tone | Text | speaker_intent |
|---|---|---|---|---|
| `L-CH-T2-08-5-setup` | dialogue | matter_of_fact | That's the Hallow order done. Crate goes to the green before noon. *(12)* | Closes the visit by stating the next job; the goodbye is a schedule. |
| `L-CH-T2-08-5-a` | surface_action | matter_of_fact | **[action]** [Pick up the crate and carry it out for him] | — |
| `L-CH-T2-08-5-a-r1` | dialogue | quiet | The crate, then. *(3)* | Accepts, and only just; being carried for is the hardest thing in the room. |
| `L-CH-T2-08-5-a-r2` | dialogue | warm | I'll get the door. Left at the well, it's the blue gate. *(13)* | Immediately supplies the route and the door so the favour is repaid inside the same breath. |
| `L-CH-T2-08-5-b-p` | player_line | matter_of_fact | Keep something back for me next time. *(7)* | — |
| `L-CH-T2-08-5-b-r1` | dialogue | warm | Seed loaf. Come before noon, they go first. *(8)* | An order to fill is the easiest thing anyone can hand him, and the speed of the answer shows it. |

Records per graph: `-a` Trust, `-b` Intimacy.

---

## Notes for review

- **Per-state variants:** none required. C1 reads no prior fact, so the content block gives one incoming state. The only branch difference is node 4 and its child opening or auto-skipping.
- **Closed path unchanged:** a player who never picks `-1-a` leaves without `shelf_seen`. Reopening depends on the proposed `ex-shelf` examinable, which is still unbuilt.
- **Tone versus the scene lock.** `register.md` locks one tone per scene, and this scene's lock is `matter_of_fact`. The task asked for a tone per slot, so the flat receiving beats are recorded as `quiet` and the giving beats as `warm`. Read as a scene, the cadence never changes; read as data, three tone values appear where the register expects one. That is a schema-versus-register question, not a prose one, and it is Roc's to rule.
