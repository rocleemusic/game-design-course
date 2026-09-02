# Intro probe — Mara, first meeting, the mage clocked

**Status: probe, uncommitted.** Written 2026-08-17 for Roc: what does Mara say the first time she meets the player, realises they're a mage, and introduces herself?

**Position:** the `player intro` class. Sits *before* `mara-set-for-two-C1`, which is first contact **this week**. This is first contact **ever** — the true-new-game opening where the player is always dealt mage (`gdd/06-world-and-progression.md`).

---

## Revision 2 — what was wrong with the first pass

**Roc's note: she would not be this way with a stranger.** Correct, and the error was structural.

I read *"her welcome is a small imperative — she asks you for a hand and puts a job in it"* as her opening move. It isn't. It's her **warmth channel** — the card says *being enlisted into the tending is how she lets someone in*. Enlisting is what happens **after** she has decided about you. Hand a stranger the twine on sight and she is fully open by line two.

That killed the scene. She started where she should have finished, so nothing turned.

**What changed.** She is short, incurious and transactional at the open — a stall-holder with a wet delivery and someone she doesn't know standing in the way. Not cold. Busy. **The job now arrives at the end, as the thing the mage reveal earns.**

Also cut: *"Then you can make things last."* It was the best line in revision 1 and she would never say it to someone she met four minutes ago. It's too exposed. Saved for week three, where it costs her something.

**A stranger offering to help now gets refused** (option `-c`). That's what makes the `-a` branch land — you don't get in by offering, you get in by proving you can preserve something.

---

## The two craft problems, and how they're solved

**1. Thing-versus-person.** She notices what has changed since last year before she notices who is in the room. So she cannot react to a person arriving. She reacts to **the stems** — turns them over, looks at the cut ends, and only then looks up.

**2. What a mage is, to Mara.** Not power, not wonder. Someone who can make things last, which is the most Mara-relevant fact that could exist about one. So her reaction is not deference. It's a capacity question, and then a job.

Under it, never said: the one thing she wanted to last didn't.

---

## The slots

| slot id | slot_type | tone | text | W |
|---|---|---|---|---|
| `O-I-1` | object | matter_of_fact | **[action]** The stall is half-set. Cut herbs heaped on the bench, dark with the morning's wet, and the drying line already full end to end. | 25 |
| `A-I-1` | action | matter_of_fact | **[action]** Mara does not look up. The twine goes round the bundle twice and she bites it off. | 17 |
| `L-I-1` | dialogue | matter_of_fact | "Tonics are the far end. Herbs aren't made up yet." | 10 |

Ten words. No greeting, no name, no question. She takes the player for a customer and directs them somewhere else without looking at them. **Deliberately under her 12–25 band** — that band is her at ease, explaining while her hands work, and she is not at ease with a stranger.

### Option `-a` — dries the bundle *(deed · the mage tell)*

| slot id | slot_type | tone | text | W |
|---|---|---|---|---|
| `L-I-a-act` | action | matter_of_fact | **[action]** [Draw the wet out of the bundle — a small working, the kind you'd use on a coat.] | 18 |
| `A-I-2` | action | quiet | **[action]** Mara stops. She turns the stems over and looks at the cut ends. | 14 |
| `L-I-2` | dialogue | delighted | "That's dry. Right through the middle, where they rot first." | 11 |
| `L-I-3` | dialogue | matter_of_fact | "You'll be the new mage." | 5 |
| `A-I-3` | action | matter_of_fact | **[action]** She looks at the player properly for the first time. Then back at the line, and at the heap on the bench. | 23 |
| `L-I-4` | dialogue | matter_of_fact | "How much can you do at once?" | 7 |
| `L-I-5` | dialogue | matter_of_fact | "Then take that end of the line. Wet ones come off, dry ones go up, and I'll keep cutting." | 19 |
| `L-I-6` | dialogue | warm | "Mara. Don't stack them, they want air between." | 9 |

**`A-I-2` is the character in one slot.** She checks the *thing*. She does not look at the player until she has looked at the cut ends.

**`A-I-3` is the turn.** She looks at the person, then does the sums — the line, the heap, what this could save. That calculation is the whole scene and it happens in an action slot with no dialogue in it.

**`L-I-4` — the first question she has asked all scene, and it's about capacity.** Not where they came from, not what their name is. What can you preserve, and how much of it.

**`L-I-5` — the job, and it is now earned.** This is the enlisting, arriving as a result rather than an opener. It is the warmest thing she does and it looks like a work order.

**`L-I-6` — the name last, buried in an instruction.** She corrects their handling and gives her name in the same breath, with the name first and the correction carrying the weight. She introduces herself as an afterthought to the work.

### Option `-b` — asks her name straight out *(spoken · the door shut)*

| slot id | slot_type | tone | text | W |
|---|---|---|---|---|
| `L-I-b-p` | player_line | matter_of_fact | "What should I call you?" | 5 |
| `L-I-b-r1` | dialogue | matter_of_fact | "Mara. Tonics are the far end." | 6 |

Name given, question closed, redirected in six words. Nothing is refused and nothing is given. Compare `L-I-6`, where the same name arrives with a job attached.

### Option `-c` — offers to help *(spoken · refused)*

| slot id | slot_type | tone | text | W |
|---|---|---|---|---|
| `L-I-c-p` | player_line | matter_of_fact | "Do you want a hand with those?" | 7 |
| `L-I-c-r1` | dialogue | matter_of_fact | "No. They want doing right, not doing fast." | 9 |

**She refuses.** The tending is hers and doing it wrong costs her the thing itself. Warmth is invariant, so this is not a rebuff of the person — it is an exact statement about the work, which is the only register she has for a stranger.

This branch is what makes `-a` land. You do not get in by offering. You get in by proving you can keep something from being lost.

### Option `-d` — takes the redirect and goes to the far end *(deed)*

| slot id | slot_type | tone | text | W |
|---|---|---|---|---|
| `L-I-d-act` | action | matter_of_fact | **[action]** [Go to the far end of the stall where the tonics are.] | 13 |

No line. She has already said the only thing she has to say to a stranger, and she goes back to the bundle. **The scene is allowed to produce nothing.** She never learns what the player is and nothing is lost.

---

## What this probe establishes

**1. The tone enum is doing the work again.** One slot needs the register change — `L-I-2`, and only for the word `delighted`. Everything else is legal today.

Second probe, same result. The vignette bought seven words. This buys one. **The tone vocabulary is carrying almost everything you wanted, and the deflection loosening is carrying almost none of it.**

That's a pattern now, not a coincidence — and it matters, because tone is a free doc edit and the deflection change is eight card rewrites in the eight days before the capstone.

**2. Her band is a range, not a floor.** She sits at 5–10 words with a stranger and 19–25 once the player is inside the work. Same scene. That range *is* the arc of the conversation, and it's available under the card as written — the card just never said the low end was allowed.

Worth adding to her declaration: the band moves with proximity, not only with weight.

**3. The recognition has to be a deed.** `-a` fires because the player uses the craft in front of her. `-c` and `-d` never fire and cost nothing. That keeps the discovery inside the game's loop instead of handing it over in exposition.

---

## Two things to rule on

**1. Is "the new mage" something villagers say?** I kept it flat — a fact about the year. I avoided *"the mage they dealt us this year"* because I don't know whether role-dealing is in-fiction. If souls and villagers know roles get dealt, that version is far better and far stranger. If they don't, it breaks the world.

**2. Does this replace or precede `mara-set-for-two-C1`?** Either a true-new-game variant of that scene, which keeps the graph flat, or a separate opening that runs once ever. I'd take the variant unless the opening needs more room than one conversation.
