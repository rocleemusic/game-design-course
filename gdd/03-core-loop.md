# Core Loop

The four verbs, a life, the festival cycle, the festival-outcome spectrum, and onboarding. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. Casting and spells specifically: [`04-magic-system.md`](04-magic-system.md). Save-state and the game clock: [`06-world-and-progression.md`](06-world-and-progression.md).

## The four verbs

- **Collect.** Pick up anything collectible: components, made things, mementos, spell-phrases (knowledge), and sounds (audio-objects). Listening is Collect applied to sound.
- **Make.** Combine components plus learned knowledge into an output: a spell, a dish, a craft, a piece of art. One structure for all three.
- **Use.** Apply a held thing (a spell or an item) to a target: ignite a lantern, still the water, offer a scritch to a cat. Presenting an item or a sound to a neighbor is also a Use, with the neighbor's reaction as the result.
- **Converse.** Talk to an NPC. Distinct from Use: no object changes hands, the exchange is dialogue.

**Starting a life.** On a true new game — no save data yet anywhere on disk — you're always dealt mage, the onboarding arrival. Once any save exists, creating another save slot lets you pick your role instead — for the slice, a choice between mage and blacksmith (see [`07-cast.md`](07-cast.md)) — locked for as long as that life runs. Continuing an existing life past its first festival cycle now ships for the slice, not just the full game (T13, ruled 2026-08-23, built 2026-08-24) — finishing a festival offers Continue, which starts the next year in the same slot. To play a different role, create a new save slot instead. You start in the town or the forest. A day runs **morning → afternoon → evening** on a move budget (see [`06-world-and-progression.md`](06-world-and-progression.md)). Each screen hosts solo interactions and social interactions with any souls present. The first screen teaches the four verbs by doing.

**The satchel, the notebook, the home.** You carry a satchel and a notebook. The notebook can be referenced at any time and holds the knowledge you have collected. At day's end you carry from the screen only what fits the satchel, and you return home. You can also end a day early to bank a full pack plus what you can carry in your arms (pack-triage). Your home is this life's hub: you decorate it and can carry items back out of it (they take satchel room). It starts empty at each new life; everything you've ever collected is recorded permanently in the meta-hub. When ready to move on, you open the calendar and pick the next day's location.

**Start-of-day location (RULED 2026-08-19).** The day's starting location is a choice between exactly two screens — **Town Square** and **Forager's Clearing** — the "town or the forest" the four-verbs onboarding names, now fixed to these two and no others. The choice is made on day 1 at the start, and thereafter from the calendar's next-day pick. The calendar records each past day's chosen location, so the week reads back as the path the player took. Day 5 carries no location choice — it is **Festival Night** (see the day-5 exception below).

**The festival cycle.** A cycle is the lead-up to one festival night — one week in the slice, up to three in the full game. The lead-up builds toward festival night; the outcome depends on the choices you make. On a new run with the same save slot, the calendar turns toward next year's festival — time passes and neighbors remember what you did — and you learn what happened in the past year through dialogue. Cycles repeat within one continuous life: the roles stay fixed, and your home, bonds, and collection carry from one festival to the next.

**Ending a festival.** Each festival night closes on an ending vignette shaped by the player's decisions, then time advances to the next festival. Each NPC has a goal for the festival that the player can assist with. The grandness of the festival depends on how many goals are completed.

**The day-5 exception (RULED 2026-08-01).** The last day of a cycle breaks the ordinary loop. When evening's move budget exhausts on that day, the player returns home as always — but the home hub offers no calendar (there is no next day to plan for). Its only forward option is **Go to the Festival night**, which starts the **final sequence**:

> **Final sequence.** A one-way ending sequence, not a fourth time block. It starts when the player chooses to go to Festival night from the last day's home hub, and leads to the **final screen** — festival results, a discovery summary, and a choice: **continue into the next year** in the same save slot, or **return to the main menu**. (T13, ruled 2026-08-23, built 2026-08-24 — ships for the slice, not just the full game.)

Night rules, once the final sequence begins: no move budget; the Festival Grounds is the only screen; every NPC with a festival-night scene is playable there, in any order; once every one of them has been played the festival vignette plays on its own, or the player may start it early at any time. The vignette itself is placeholder-only until the prose pass (`plans/2026-08-01-festival-night-transition-plan.md`); it always leads to the final screen. Night is not one of the ordinary daily blocks (**morning → afternoon → evening**) — it is reached only through the final sequence, never by moves or by the ordinary block-to-block clock.

**A new life.** Beginning a new life — a fresh save slot — reshuffles the souls. Personalities stay fixed, but each soul's role in the town is re-dealt — the baker may return a herbalist. The bond level you build with a soul persists across lives, leading to different outcomes. As your bond deepens across lives, its dialogue **warms**: more familiar, more shorthand. Your care also shows up **obliquely** in the world — a neighbor you once helped find her voice now speaks up for a stranger, never thanking you. Starting this new life also means choosing a role again — for the slice, mage or blacksmith — the same choice offered whenever save data already exists elsewhere on disk; a true new game (no save data at all) is always dealt mage instead.

## Conversation pacing within a day

**Ruled 2026-08-04, softened and extended 2026-08-06.** Talking is not free, and what bounds a week is conversations rather than opportunities. Four rules:

1. **A conversation advances the clock.** One that ends in the morning leaves the player in the afternoon.
2. **A thread may be entered at most once per time slot.**
3. **The festival arc is the first thread enterable in a day** — it takes the opening slot.
4. **Later slots allow multiple threads.** Only the opening slot is festival-only.

**A quiet beat costs a full time block.** A conversation that reveals nothing spends the same slot as one that does, because it is part of a thread and should feel costly. Breathing room is not free, and a thread cannot be padded with quiet beats to fill a week.

**Placement is not the constraint.** A deep soul is placed roughly **16 times a week** — 3 per day, 4 on day 5 — not the five that earlier docs assumed; five is the *guaranteed floor* from the resolver's one-scene-screen-per-day rule. Most of the other eleven are co-presence slots. Under the rules above a cast thread advances about twice a day.

**Still open** (`GP-93`, not ruled): whether the festival arc is merely *offered* first or *occupies* the opening slot whether or not the player enters it; and whether a minimum gap should pace threads across the week, or a player finishing a four-conversation thread by the end of day 2 is acceptable.

Implementation is unbuilt — today nothing gates re-entry at all (`ink.ts`: "everything is sticky"; `seen()` is dialogue colour, never a lock).

## Festival outcome & soft terminal states

Festival night reads the cycle — the **contributions** you made — through a single success function, and renders the result as a **spectrum, not a branch**. There are no separate festival scenes: it is one festival, dressed differently in its lighting, its vignette, and who shows up, across **three tiers, each carrying its own magic display**. **Grand is the top.** The full account of what each tier shows is in [`00-world-bible.md`](00-world-bible.md)'s Festival-night section:

- **Quiet** — a modest festival; a few souls present, low warm light. A thin scatter of lights over the square.
- **Warm** — the town turns out; the square fills, the lanterns are lit. The lights gather and drift, shapes almost forming.
- **Grand** *(the top)* — a radiant festival, the fullest turnout, the Lantern Arch at its brightest. The display reaches full flood: the lights become the returned, and past them the **souls of the world** in one tableau. The "going big" moment (see [`09-art-direction.md`](09-art-direction.md)).

**IMPLEMENTATION RULING — the exact arithmetic (Roc, 2026-08-23; built as T9, 2026-08-24).** Everything above is the narrative design: the soul-want × role-goal pairing engine that generates each cycle's story stays exactly as described below, untouched. What was missing until T9 was the plain scoring read layered on top of it, at festival night only:

- **Tier is the count of completed festival goals, nothing else.** A role's goal counts as completed the first time the player moves any of that role's authored `goal_threads` (`world/FestivalScore.ts`'s `festivalGoals`/`tierFor`). 1 goal complete = Quiet, 2 = Warm, 3 = Grand — the same three tiers above, driven by a plain count the player never sees. **Bond never feeds this count** — see below.
- **Bond is a separate, host-side talk calendar, not a second score.** Every time the player opens a soul's conversation, that soul's tally for the day ticks once, capped at **one count per soul per day** — so five is the ceiling for any one soul across the slice's five-day week. This is a distinct fact from the single weighted bond number `tools/lantern/src/lib/world.ts` already tracks per soul (which stays exactly as it was, and which `GateEngine`'s `bond_band` gate conditions still read) — the talk calendar answers "how many days did the player go and talk to them," nothing more.
- **Bond drives per-soul things only: dialogue depth, and who turns out.** It never moves the tier, by the same two-tracks rule stated below for the soul's inner arc — this is that rule, made countable. A week of nothing but talking, every soul at the week's ceiling, still renders Quiet if no festival goal got finished; a week that never talks to anyone can still go Grand.
- **The rare top state — souls-of-the-world — is a boolean riding on Grand, not a fourth tier.** All three goals completed **and** every soul in the cast at the week's talk ceiling. Parked as "unless cheap" and this is the cheap version: one extra check, no new tier.
- **The tier is still never a score shown.** It reads through the festival's own look, and bond reads through who shows up and what they say — neither is ever rendered as a number.
- **Goal completion is the one exception (Roc, 2026-08-31).** `render/FestivalResults.ts` now shows an N/M count of finished festival goals on the Results screen. This reverses the "never a score shown" rule stated two paragraphs below, but only for this one count — the tier, and everything about bond, stay unrendered as numbers.

**What drives the tier: soul-want × role-goal.** The success function is not a points total. **Every occupation carries its own festival goal** — the blacksmith forges a new centerpiece for the Lantern Arch, the baker prepares the communal feast, the postman delivers the festival letters. Those goals are what the town is collectively trying to finish before festival night, and how far they get is what dresses the festival. The player's own picked role carries a goal from this same table too, if it's a civic one — whichever role they lock in for the life becomes their personal contribution toward every cycle's tier. Mage is the exception: its goal is personal (collect magic from around the world), not civic, so a mage-holding player doesn't contribute a role-goal to the tier this way.

The engine is the **pairing**. Each soul has a fixed **want** (its essence — see [`07-cast.md`](07-cast.md)); each life deals it a **role** carrying that role's goal. The pairing lands somewhere on **tension ↔ alignment**, and *that permutation is what makes the same soul's story different from one life to the next* — it is the reshuffle's narrative payload, not just a cosmetic re-skin.

Worked example, the one the pipeline generated against: **the Giver dealt the Baker.** His want is to be needed and never to receive; the baker's goal is a feast one pair of hands cannot finish. The pairing is in **tension**, so the role itself manufactures the situations his arc turns on — every baker mishap tilts toward him having to accept help. Deal the same soul a role whose goal he can discharge alone and the tension drops to **alignment**: the same essence, a different life, a different story.

**Two tracks, running in parallel and never colliding.** The festival goal is the soul's **external** objective and it moves the tier. The soul's arc — its belief shifting across the cycle — is **internal** and moves nothing on the tier. A player who never touches a soul's inner life can still drive a Grand festival by helping the town finish its work; a player who goes deep on one soul and ignores the rest gets a Quiet festival and a different story. **Neither is the correct way to play**, which is what keeps the spectrum from collapsing into a score.

The generative tables that turn this into playable content — the per-occupation mishap pool keyed to each role's goal — live in the arc doc ([`../narrative-pipeline/arc-festival-slice.md`](../narrative-pipeline/arc-festival-slice.md)), so the crew can generate encounters against it rather than having each one hand-authored.

**How a dialogue choice feeds the tier (ruled 2026-07-29).** At a choice node ([`../narrative-pipeline/templates/choice-node-schema.md`](../narrative-pipeline/templates/choice-node-schema.md)) the player picks the actual words they say — never a labeled feeling. A choice moves the tier **only through its concrete world consequence**: help with the feast and the feast is further along, which is the role-goal moving, the same engine as above. No stored scalar records which options the player picks, neither option is the correct answer, and repeated helping never accumulates into an unlock — being claimed is a soul's own act, not a payout. This is what keeps player choice from collapsing the spectrum into a niceness meter.

There is **no hard-lose and no game-over**. A festival always ends *with something*: the ending vignette is guaranteed. Success is measured as **depth of connection reached** (knowledge of people and collection progress). The game cannot be lost, only lived. The one number the player does see is the goal-completion count noted above — everything else in this measure stays unrendered as a score.

## Onboarding

The first screen teaches by doing. On a new save you pick a persona and open in the world with a small set of **safe, obvious hints** that teach the four verbs one at a time: something to **Collect** lying in reach, something to **Make** from it, something to **Use** it on, and a neighbor to **Converse** with. The **notebook is introduced as a found object** — you pick it up, and it is already yours. By the end of the first screen the player has done all four verbs.
