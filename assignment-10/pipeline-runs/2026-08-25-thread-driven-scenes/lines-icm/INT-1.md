# INT-1 — Intro scene, ICM-style single-pass generation

**Approved by Roc, 2026-08-25.** Supersedes the slot-by-slot `INT-1` output
from `lines/` — that approach (isolated setup/option calls with only a
terse structure snippet as context) produced weaker, more disconnected
prose than a single continuous generation with full world context, the
way `assignments/assignment-8-icm/` handles a turn. This file is the new
method's first result.

**Model:** Muse-12B (`Muse-12B.Q4_K_M.gguf`), single continuous call, full
world context (mage's motive, Hearthlight's character, the truth-guard),
no slot fragmentation, no strict word ceiling per Roc's call for this pass.
Second-person POV, approved by Roc as fine for this scene.

**Corrections applied across two generations, both confirmed in this
final version:** mage arrives on foot (no ferry), festival week has just
begun rather than being in full swing, NPC greeting carries no hint or
tease of the magic mystery.

---

The road to Hearthlight winds through autumn-touched fields, the grass golden in the afternoon light. The distant town glows warmly as the sun sinks toward the horizon, the stone Arch at its heart catching the last of the day's fire. You walk with your staff in hand, the strap of your pack settled comfortably across your back, your steps steady from the miles behind you.

The air carries woodsmoke, bread, and something spiced — perhaps mulled cider. A few figures move through the streets ahead, setting up tables and hanging lanterns, but nothing yet feels fully festival-ready. You have arrived just as the week begins, as the town stirs awake with its annual celebration.

The path narrows as you approach the town proper, worn smooth by countless feet over centuries. The first buildings rise up before you, their dark wood and whitewashed walls reflecting the golden light of the setting sun. You step into the town square, a cozy space framed by timber-framed cottages and a bubbling fountain at its center. The square is bustling with villagers going about their morning chores, children playing, and the scent of fresh bread wafting from a nearby bakery. A woman, broad-shouldered and aproned, is sweeping the threshold of a shop, her broom bristling with stray leaves. She pauses as you draw near.

"Ah, another festival-goer," she says, resting the broom against the wall. Her tone is easy, matter-of-fact — no surprise in her greeting, no particular curiosity beyond the polite sort any townsperson might show. "You're a bit early for the main festivities, but I daresay you'll find plenty to see if you're looking. Welcome to Hearthlight."

"Might I ask your name?"

*What is your name?* {player_name}

Her eyes flick to your staff, then back to your face, her expression neither startled nor dismissive. "Magic folk, then. Don't get many of your kind wandering through. Don't get many folk wandering through at all, really — Hearthlight's got a habit of drawing those who need a place to settle more than it draws those just passing through." A dry chuckle follows, and she wipes her hands on her apron. "That said, you've got a week ahead of you. Town's got plenty to offer, if you know where to look."

She turns back to her sweeping, dismissing you as neatly as she greeted you. The conversation is over, not with any rudeness but with the unspoken understanding that the next move is yours. The road stretches behind you, and the town sprawls before you, its lanterns flickering to life as the evening deepens. The festival's magic hangs in the air, unspoken but unmistakable. You have come for it, and the town waits to show you what it holds.

---

**Known open item, not yet fixed — flagged for the next pass or hand-edit:**
the closing paragraph's last two sentences ("The festival's magic hangs in
the air, unspoken but unmistakable... the town waits to show you what it
holds") still tease the magic mystery, even though the NPC's own dialogue
stays clean. Roc called this good enough to save as-is; revisit if it needs
tightening before this goes anywhere near canon.
