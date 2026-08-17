# `toby-the-shelf` — C1 line slots · `SC-T2-08`

**Conversation:** C1, first contact. Carries R1 (the shelf of unopened jars exists).
**Structure source:** `../toby-the-shelf.md` § "C1 — `SC-T2-08`", approved by Roc 2026-08-06, action layer included. Nothing structural altered.
**Soul:** `toby` (`cast/toby.md`). Ceilings: dialogue 40 · action 60 · object 60 · player_line 12.
**Render convention:** every non-dialogue slot is prefixed `[action]`, once.
**Speaker for all `dialogue` slots:** `toby`. No other speaker appears in C1; no walk-on.

**Incoming states:** one — zero knowledge. C1 reads no prior fact. Node 4 and its nested child gate on `shelf_seen`, set inside this same conversation, so the only walk difference is asked-about-the-jars versus not. **No per-state variants required.**

**Staging vocabulary:** heat and early morning — ovens coming up, trays, the rail, flour, the first bake, things too hot to hold.

**Sanctioned long run:** none placed. Nothing in C1 is exposition, instruction at length, or a confession answering a question, and the two heaviest beats (node 4, the nested child) are exactly where a run is barred — he is being seen.

**Rewritten 2026-08-06**, complete replacement of the previous pass. That pass was written against the superseded register, carried no action slots, and was returned "cold and choppy."

---

## `CH-T2-08-1` — first contact, counter mid-order, jar shelf in view

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `O-SC-T2-08-1` | object | matter_of_fact | **[action]** Behind the counter stands a shelf of jars. There's a ribbon on two of them. They look to be still sealed. Toby is rushing around the bakery. |  | — |
| `L-CH-T2-08-1-s` | dialogue | matter_of_fact | "Ovens are up. First bake comes off in a minute, so mind the counter as you pass it." |  | Opens on the room's business and hands the player a piece of it, which is how he greets anyone. |

### Option `-a` — asks about the shelf of jars *(spoken · sets `shelf_seen` · moves `toby-the-shelf`)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-1-a-p` | player_line | matter_of_fact | "What are all the jars?" (4 w) |  | — |
| `L-CH-T2-08-1-a-r1` | dialogue | quiet | Toby answers quickly as he rushes by: "Thank-yous." |  | Attention has turned on him, so the answer goes as short as it goes. He names the surface and nothing under it. |
| `L-CH-T2-08-1-a-r2` | dialogue | warm | "Kettle's been on the side a while. Pour yourself some tea, it's the good stuff." |  | The warmth arrives as a thing already waiting, worked out before the question, and he never says he put it there. |
| `L-CH-T2-08-1-a-r3` | dialogue | matter_of_fact | "Pass me the peel and I'll have the first trays out." |  | Gives the attention a job to land on instead of him, and the tempo comes straight back the moment the talk is work. |

### Option `-b` — steps in on the order at hand *(deed · Intimacy)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-1-b-act` | action | matter_of_fact | **[action]** [A bag of flour has tipped over on the ground. Pick it up.] |  | — |
| `L-CH-T2-08-1-b-r1` | dialogue | quiet | Toby comes over and says quietly, "Ah thank you, can you hold it steady?" |  | Being helped before he asked puts him on the receiving side; he stays inside the count, the shortest place to stand. |
| `L-CH-T2-08-1-b-r2` | dialogue | warm | Toby levels the flour and measures some out, "Your sleeves will be white. Roll them up and I'll wait for you." |  | Levels the favour by anticipating the next small trouble and holding the work still until it is handled. |

### Option `-c` — plain talk about the order *(spoken · records nothing)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-1-c-p` | player_line | matter_of_fact | "Early start for a bake this size." (7 w) |  | — |
| `L-CH-T2-08-1-c-r1` | dialogue | matter_of_fact | "Twelve for the Hallow house, it'll be out by noon." |  | The size of the job is converted into a schedule that is already solved, before anyone can worry about it aloud. |
| `L-CH-T2-08-1-c-r2` | dialogue | warm | "There's some space on the window sill, feel free to sit there." |  | Supplies a place to be, then makes it nobody's in particular so no thanks can attach to it. |

*Records per graph: `-a` sets `shelf_seen`, moves `toby-the-shelf`; `-b` Intimacy; `-c` nothing.*

---

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `A-SC-T2-08-2` | action | matter_of_fact | **[action]** Toby slides two trays onto the counter and turns the third to face the heat. |  | — |

## `CH-T2-08-2` — the order work continues

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-2-s` | dialogue | matter_of_fact | "Rye goes first, it takes the longest. White after." |  | Runs the order out loud as a sequence, which keeps his hands and the conversation both moving outward. |

### Option `-a` — fetches the next tray before he asks *(deed · Intimacy)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-2-a-act` | action | matter_of_fact | **[action]** [Lift the next tray off the rack and set it beside him] |  | — |
| `L-CH-T2-08-2-a-r1` | dialogue | quiet | "That's the seed tray." |  | Answers the deed by naming the thing rather than the act, because the act was done for him. |
| `L-CH-T2-08-2-a-r2` | dialogue | quiet | "You got there ahead of me." |  | Flat and not a complaint. Somebody moved first, which almost never happens to him. |
| `L-CH-T2-08-2-a-r3` | dialogue | warm | "Take the cloth off the hook before you lift the next one. The handle has a tendency to be hot." |  | Settles the receiving the only way he can, by supplying against something he has already worked out will hurt. |

### Option `-b` — asks who the order is for *(spoken · Trust)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-2-b-p` | player_line | matter_of_fact | "Who's this bake for?" (4 w) |  | — |
| `L-CH-T2-08-2-b-r1` | dialogue | matter_of_fact | "The Hallow house. Two of them won't touch rye, so it's four white, four seed, four rye." |  | Counts a household's needs out without being asked to. Exactness about other people is where he is fluent. |
| `L-CH-T2-08-2-b-r2` | dialogue | warm | "Their youngest likes the dark end, so I leave one in longer for her." |  | The recognition hook as behavior: he knows what one child prefers and quietly builds the bake around it. |
|  |  |  |  |  |  |

*Records per graph: `-a` Intimacy; `-b` Trust. `precision_profile` referenced, no fact slot.*

---

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `O-SC-T2-08-3` | object | quiet | **[action]** A folded cloth waits on the near edge of the counter, within reach of the hot tray. |  | — |

## `CH-T2-08-3` — the needed thing is already set out

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-3-s` | dialogue | matter_of_fact | "That one's coming off now. It'll be too hot to hold for a good while." |  | Warns before the trouble arrives, which is the same move as putting the cloth there, said out loud about the tray instead. |

### Option `-a` — names that it was already there *(spoken · Trust)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-3-a-p` | player_line | matter_of_fact | You notice a cloth appeared on the counter. "That cloth was out before I needed it." (8 w) |  | — |
| `L-CH-T2-08-3-a-r1` | dialogue | quiet | "Can't be too careful." |  | Prices the act down into furniture so it cannot be read as done for anybody. |
| `L-CH-T2-08-3-a-r2` | dialogue | quiet | "I always have them handy." |  | A second, smaller cover. He is closing the credit out, never the person. |
| `L-CH-T2-08-3-a-r3` | dialogue | warm | "Double it over on the hot side. If not you'll feel it." |  | Being named does not switch the anticipation off; it just goes back to being instructions about a cloth. |
|  |  |  |  |  |  |

### Option `-b` — takes it and keeps the counter moving *(deed · Intimacy)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-3-b-act` | action | matter_of_fact | **[action]** [Take the cloth and move the tray on down the counter] |  | — |
| `L-CH-T2-08-3-b-r1` | dialogue | matter_of_fact | "Hold on to it. There's a stack of them under the bench." |  | Gives it away and immediately makes it plentiful, so keeping it can never be something owed for. |
| `L-CH-T2-08-3-b-r2` | dialogue | warm | "Give it a count of fifty and the crust won't burn you." |  | The habit passed unremarked, which is what he wants, so the supplying simply carries on to the next thing. |

*Records per graph: `-a` Trust; `-b` Intimacy. `warmth_channel` staged as business, referenced, no fact slot.*

---

## `CH-T2-08-4` — the shelf acknowledged *(gated `knows(shelf_seen)`)*

Gate false: the node auto-skips to its gather. No alternate content authored, per the content block.

**Rule-19 build.** The set-up is fragment → action → shorter fragment. The action slot is the pause; nothing here gets a longer line. Ids follow the locked `-s` pattern, split `-s1` / `-s2` around the thread's own `A-CH-T2-08-4-s`.

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-4-s1` | dialogue | quiet | "People like to bring things sometimes. I keep them." |  | Confirms a fact and refuses the reason. He can hold the what steady; the why is not available to him. |
| `A-CH-T2-08-4-s` | action | quiet | **[action]** Toby crosses to the flour sacks and re-knots a tie that has not slipped. |  | — |
| `L-CH-T2-08-4-s2` | dialogue | quiet | "Can't be too careful." |  | The unfinished task arrives on cue and he takes it, so the talk can move to the job and off him. |

### Option `-a` — notes that none of the jars are opened *(spoken · Recognition — the deep read)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-4-a-p` | player_line | quiet | "None of them are open." (5 w) |  | — |
| `L-CH-T2-08-4-a-r1` | dialogue | quiet | "No." |  | Agreement with no cover under it. He has no reason ready and he does not build one. |
| `L-CH-T2-08-4-a-r2` | dialogue | quiet | "Ribbon's still on two." |  | Offers the detail instead of the reason. The fact is all he can hold at this weight. |
| `L-CH-T2-08-4-a-r3` | dialogue | warm | "It's drafty where you're standing. The oven side's warmer, move over to that side." |  | The deepest beat in the conversation, and the warmth still lands, on the only channel he has. |

### Option `-b` — turns back to the order with him *(deed · Intimacy)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-4-b-act` | action | matter_of_fact | **[action]** [Pick up the flour scoop and start filling beside him] |  | — |
| `L-CH-T2-08-4-b-r1` | dialogue | matter_of_fact | "Right. Two trays and the crate and we're clear before the square fills." |  | Handed his cover back, he is quick again inside a breath. The returning tempo is the whole tell. |
| `L-CH-T2-08-4-b-r2` | dialogue | warm | "Take the near bin, that one's sifted. The packed one needs breaking loose first." |  | The moment somebody shares the work he re-sorts it so the stiffer half is his again. |

*Records per graph: `-a` Recognition, then enters the nested node; `-b` Intimacy.*

---

## `CH-T2-08-4-a-1` — mid-deflection he supplies the player something anyway *(nested inside `-4-a`)*

The child's set-up **is** the action slot, per the content block. It carries no dialogue.

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `A-CH-T2-08-4-a-1-s` | action | quiet | **[action]** Toby sets a warm roll on the board by the player's hand, eyes still on the sacks. |  | — |

### Option `-a` — names that he has just done it again *(spoken · moves `toby-the-shelf`)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-4-a-1-a-p` | player_line | quiet | "This for me?" (5 w) |  | — |
| `L-CH-T2-08-4-a-1-a-r1` | dialogue | quiet | "It's off the first bake." |  | Answers with the object rather than the act, still unwilling to let it be counted as a given thing. |
| `L-CH-T2-08-4-a-1-a-r2` | dialogue | quiet | "They're best about now." |  | Reroutes what he did into a fact about timing, which is the smallest cover in the room. |
| `L-CH-T2-08-4-a-1-a-r3` | dialogue | warm | "Eat it while it's hot. Butter's in the crock behind the scales." |  | Named for it and he answers with more of the same thing, plus what the player would have reached for next. |

### Option `-b` — takes it without comment *(deed · Intimacy)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-4-a-1-b-act` | action | matter_of_fact | **[action]** [Take the roll and say nothing] |  | — |
| `L-CH-T2-08-4-a-1-b-r1` | dialogue | matter_of_fact | "Another under the paper when that's gone." |  | Unremarked giving is the safe kind, so he moves straight on to offering the next one. |
| `L-CH-T2-08-4-a-1-b-r2` | dialogue | warm | "Take a second one for later. I always bake past what the morning needs." |  | Sends something out with the player and makes the surplus his own doing, so nothing is owed on it. |

*Records per graph: `-a` moves `toby-the-shelf`; `-b` Intimacy.*

---

## `CH-T2-08-5` — leave-taking

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-5-s` | dialogue | matter_of_fact | "First bake's off. The crate wants to be at the stall before the square fills up." |  | Closes the visit by naming the next job, and the job is his; the goodbye is a schedule. |

### Option `-a` — offers to carry the order out *(deed · Trust)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-5-a-act` | action | matter_of_fact | **[action]** [Pick up the crate and carry it out for him] |  | — |
| `L-CH-T2-08-5-a-r1` | dialogue | quiet | "The crate..." |  | Accepts, and barely. Being carried for is the hardest thing in the room and the line shortens to match. |
| `L-CH-T2-08-5-a-r2` | dialogue | quiet | "It's not much weight." |  | Not a refusal. A discount on what is being done for him, so the debt it opens stays small. |
| `L-CH-T2-08-5-a-r3` | dialogue | warm | "I'll get the door. Blue gate past the well, and tell them the second crate comes at noon." |  | Repays inside the same breath with the door, the route, and a message worth the carrying. |

### Option `-b` — asks him to keep something back for next time *(spoken · Intimacy)*

| slot id | slot_type | tone | text | W | speaker_intent |
|---|---|---|---|---|---|
| `L-CH-T2-08-5-b-p` | player_line | matter_of_fact | "I'll be back again tomorrow!" (6 w) |  | — |
| `L-CH-T2-08-5-b-r1` | dialogue | matter_of_fact | "Come while the ovens are still up, I'll keep a loaf for you." |  | An order to fill is the easiest thing anyone can hand him, and the speed of the answer is how much he wanted it. |
| `L-CH-T2-08-5-b-r2` | dialogue | warm | "I'll put aside two. Their yours whether you make it or not." |  | Doubles it unasked, and the second one is held for the person rather than for the visit. |

*Records per graph: `-a` Trust; `-b` Intimacy.*

---

## Notes for the gate

- **Receiving pairs.** Every option where he is receiving carries two or three response slots, with the flat line first and the warmth in the following slot, named on a thing: `-1-a`, `-1-b`, `-2-a`, `-3-a`, `-4-a`, `-4-a-1-a`, `-4-a-1-b`, `-5-a`.
- **Asymmetry in word count.** Receiving lines run 1–6 words. Outward and supplying lines run 8–19 and every one points at a named object: kettle, cloth, hook, bin, crock, door, seed loaf.
- **The supply move is varied.** Eight instances, no two built the same way: a drink already poured, sleeves, the window end made nobody's in particular, a hot handle, a doubled cloth, a counted cooling wait, butter behind the scales, a loaf held whether or not it is collected.
- **Per-state variants:** none required. C1 reads no prior fact.
- **Closed path unchanged.** A player who never picks `-1-a` leaves without `shelf_seen`; node 4 and its child never open. Reopening depends on the proposed `ex-shelf` examinable, still unbuilt.
- **No World Truth is stated. No node grants Toby a fix.** No trait is phrased in baker terms; the bakery is staging only.
- **Register lock still flagged, not resolved here.** The scene locks `matter_of_fact`; three tone values appear across slots (`matter_of_fact` / `quiet` / `warm`). Read aloud the cadence never changes. Roc's call whether the lock is per-scene or per-slot.
