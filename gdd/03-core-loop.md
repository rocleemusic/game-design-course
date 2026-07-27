# Core Loop

The four verbs, a life, the festival cycle, the festival-outcome spectrum, and onboarding. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. Casting and spells specifically: [`04-magic-system.md`](04-magic-system.md). Save-state and the game clock: [`06-world-and-progression.md`](06-world-and-progression.md).

## The four verbs

- **Collect.** Pick up anything collectible: components, made things, mementos, spell-phrases (knowledge), and sounds (audio-objects). Listening is Collect applied to sound.
- **Make.** Combine components plus learned knowledge into an output: a spell, a dish, a craft, a piece of art. One structure for all three.
- **Use.** Apply a held thing (a spell or an item) to a target: ignite a lantern, still the water, offer a scritch to a cat. Presenting an item or a sound to a neighbor is also a Use, with the neighbor's reaction as the result.
- **Converse.** Talk to an NPC. Distinct from Use: no object changes hands, the exchange is dialogue.

**Starting a life.** On a true new game — no save data yet anywhere on disk — you're always dealt mage, the onboarding arrival. Once any save exists, creating another save slot lets you pick your role instead — for the slice, a choice between mage and blacksmith (see [`07-cast.md`](07-cast.md)) — locked for as long as that life runs. Continuing an existing life past its first festival cycle is a full-game target feature, grayed out for the slice; to play the other role, create a new save slot. You start in the town or the forest. A day runs **morning → afternoon → evening** on a move budget (see [`06-world-and-progression.md`](06-world-and-progression.md)). Each screen hosts solo interactions and social interactions with any souls present. The first screen teaches the four verbs by doing.

**The satchel, the notebook, the home.** You carry a satchel and a notebook. The notebook can be referenced at any time and holds the knowledge you have collected. At day's end you carry from the screen only what fits the satchel, and you return home. You can also end a day early to bank a full pack plus what you can carry in your arms (pack-triage). Your home is this life's hub: you decorate it and can carry items back out of it (they take satchel room). It starts empty at each new life; everything you've ever collected is recorded permanently in the meta-hub. When ready to move on, you open the calendar and pick the next day's location.

**The festival cycle.** A cycle is the lead-up to one festival night — one week in the slice, up to three in the full game. The lead-up builds toward festival night; the outcome depends on the choices you make. On a new run with the same save slot, the calendar turns toward next year's festival — time passes and neighbors remember what you did — and you learn what happened in the past year through dialogue. Cycles repeat within one continuous life: the roles stay fixed, and your home, bonds, and collection carry from one festival to the next.

**Ending a festival.** Each festival night closes on an ending vignette shaped by the player's decisions, then time advances to the next festival. Each NPC has a goal for the festival that the player can assist with. The grandness of the festival depends on how many goals are completed.

**A new life.** Beginning a new life — a fresh save slot — reshuffles the souls. Personalities stay fixed, but each soul's role in the town is re-dealt — the baker may return a herbalist. The bond level you build with a soul persists across lives, leading to different outcomes. As your bond deepens across lives, its dialogue **warms**: more familiar, more shorthand. Your care also shows up **obliquely** in the world — a neighbor you once helped find her voice now speaks up for a stranger, never thanking you. Starting this new life also means choosing a role again — for the slice, mage or blacksmith — the same choice offered whenever save data already exists elsewhere on disk; a true new game (no save data at all) is always dealt mage instead.

## Festival outcome & soft terminal states

Festival night reads the cycle — the **bonds** you deepened and the **contributions** you made — through a single success function, and renders the result as a **spectrum, not a branch**. There are no separate festival scenes: it is one festival, dressed differently in its lighting, its vignette, and who shows up, across three tiers plus a rare top:

- **Quiet** — a modest festival; a few souls present, low warm light.
- **Warm** — the town turns out; the square fills, the lanterns are lit.
- **Grand** — a radiant festival, the fullest turnout, the Lantern Arch at its brightest.
- **(rare top) Souls-of-the-world display** — reached only at exceptional depth: the festival briefly shows the souls of the world, a once-in-many-lives tableau. This is the "going big" moment for the slice (see [`09-art-direction.md`](09-art-direction.md)).

**What drives the tier: soul-want × role-goal.** The success function is not a points total. **Every occupation carries its own festival goal** — the blacksmith forges a new centerpiece for the Lantern Arch, the baker prepares the communal feast, the postman delivers the festival letters. Those goals are what the town is collectively trying to finish before festival night, and how far they get is what dresses the festival. The player's own picked role carries a goal from this same table too, if it's a civic one — whichever role they lock in for the life becomes their personal contribution toward every cycle's tier. Mage is the exception: its goal is personal (collect magic from around the world), not civic, so a mage-holding player doesn't contribute a role-goal to the tier this way.

The engine is the **pairing**. Each soul has a fixed **want** (its essence — see [`07-cast.md`](07-cast.md)); each life deals it a **role** carrying that role's goal. The pairing lands somewhere on **tension ↔ alignment**, and *that permutation is what makes the same soul's story different from one life to the next* — it is the reshuffle's narrative payload, not just a cosmetic re-skin.

Worked example, the one the pipeline generated against: **the Giver dealt the Baker.** His want is to be needed and never to receive; the baker's goal is a feast one pair of hands cannot finish. The pairing is in **tension**, so the role itself manufactures the situations his arc turns on — every baker mishap tilts toward him having to accept help. Deal the same soul a role whose goal he can discharge alone and the tension drops to **alignment**: the same essence, a different life, a different story.

**Two tracks, running in parallel and never colliding.** The festival goal is the soul's **external** objective and it moves the tier. The soul's arc — its belief shifting across the cycle — is **internal** and moves nothing on the tier. A player who never touches a soul's inner life can still drive a Grand festival by helping the town finish its work; a player who goes deep on one soul and ignores the rest gets a Quiet festival and a different story. **Neither is the correct way to play**, which is what keeps the spectrum from collapsing into a score.

The generative tables that turn this into playable content — the per-occupation mishap pool keyed to each role's goal — live in the arc doc ([`../narrative-pipeline/arc-festival-slice.md`](../narrative-pipeline/arc-festival-slice.md)), so the crew can generate encounters against it rather than having each one hand-authored.

There is **no hard-lose and no game-over**. A festival always ends *with something*: the ending vignette is guaranteed. Success is measured as **depth of connection reached** (knowledge of people and collection progress), never a score shown. The game cannot be lost, only lived.

## Onboarding

The first screen teaches by doing. On a new save you pick a persona and open in the world with a small set of **safe, obvious hints** that teach the four verbs one at a time: something to **Collect** lying in reach, something to **Make** from it, something to **Use** it on, and a neighbor to **Converse** with. The **notebook is introduced as a found object** — you pick it up, and it is already yours. By the end of the first screen the player has done all four verbs.
