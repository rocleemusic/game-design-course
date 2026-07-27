# Cast (Souls)

The 8-soul roster, age bands, and the name/gender-fixed vs. role/age-redealt rule. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. For the fill-in arc template used to write a soul's arc, see [`../narrative-pipeline/templates/arc-doc-template.md`](../narrative-pipeline/templates/arc-doc-template.md); for a worked example end to end, see [`../narrative-pipeline/examples/worked-example-mara.md`](../narrative-pipeline/examples/worked-example-mara.md) and the two real generated cards, [Toby's](../pipeline-runs/2026-07-25-giver/giver-persona-card.md) and [Ilsa's](../pipeline-runs/2026-07-25-kinbound/ilsa-persona-card.md).

Every soul is built on the essence/role split (the `narrative-pipeline` persona-card schema): the **essence** — a want plus a repeated behavior — is invariant across lives; the **role** is re-dealt each new life from the shared pool below. The personality never changes; the job does. The full village is **3 deep + 5 texture (~8 souls)**; each life instantiates most of them — fate deals 1–2 as "past" (away or already gone), so every life carries a felt absence. Names below are working placeholders.

## The role pool

Roles are one shared, named pool — souls and the player both draw from it, and the pool is explicitly designed to expand on both axes (more souls, more roles) as the build grows.

| Role | Goal |
|---|---|
| **Mage** *(the newcomer)* | *Personal, not civic:* collect magic from around the world |
| **Blacksmith** | Forges the new Lantern Arch centerpiece |
| **Baker** | Prepares the communal feast |
| **Postman** | Delivers the festival letters |
| **Herbalist** | Brews the festival tonic that wards off the first frost |
| **Priest** | Leads the rite that lights the Lantern Arch and calls the souls home |
| **Farmer** | Brings in the harvest that feeds the festival week, not just feast night |

*(Parked for later expansion: Lamplighter, Village Chief — see [`../parking-lot.md`](../parking-lot.md).)*

**Mage is not player-exclusive.** Whoever holds it is "the newcomer" — a personal goal (collect magic from around the world), not a civic one like every other role's. On a new game, the player is always dealt mage and serves as the onboarding story. At the turn from cycle 1 into cycle 2 the player is given the option to continue in the save slot or create a new one. In the slice the option to continue is greyed out (scoping story content). On creation of a new save the player can choose from the full pool of roles — before the engine deals that life's present souls their roles from what's left. That pick locks for the rest of the life; it is not re-picked at later turns of the year. If the player keeps mage, they stay the newcomer; if they pick something else, mage re-enters the pool for a soul to be dealt, and that soul becomes the life's newcomer instead. For the slice only mage and blacksmith are available.

**Present-soul cap.** 6 roles remain for that life's present souls once the player has picked. "Fate deals 1–2 as past" above fits this almost exactly — 2 past (6 present) is an exact match; 1 past (7 present) is a role short until the pool grows. Lean on 2 past as the practical norm for now.

**Reuses the festival-goal engine.** A civic role's goal becomes the player's own personal contribution to the festival tier when they hold it — see [`03-core-loop.md`](03-core-loop.md)'s "Festival outcome" section. Mage is the exception: its goal is personal, not civic, so a mage-holding player doesn't contribute a role-goal to the tier this way.

## Deep souls (3) — bond-viable, hand-authored arcs

Each embodies a different *theory of belonging* the player weighs.

| Soul | Essence — want + behavior | Conviction | Recognition hook | Arc |
|------|---------------------------|-----------|------------------|-----|
| **The Keeper** *(working name: Mara)* | Belonging is *tended*: keep the festival — and the connection it anchors — from slipping into the past. Tends the anchor-spot compulsively, keeps a drawer of unclaimed objects and a corner "set for two," mends small broken things unasked, speaks of the place in the past tense. | Won't leave, won't let the tradition lapse or the anchor be moved — leaving = admitting the loss is final. *(The child's whistle in the drawer is not for sale.)* | Always finds the beauty in things — most in what's passing. | Clutch → transform: the bond *re-forms*; loss isn't permanent. |
| **Toby** — the Giver *(m)* | Belonging is *earned by being needed*. **Behavior cluster:** wants to be kept and believes keeping must be earned; reads the room for who is short of what and supplies it before being asked; converts anything given to him into a debt he repays in goods. Deflects to the unfinished task in the room. Exact about other people's quantities and timings, vague about his own. Warmth arrives as anticipation — the thing handed over a beat before it's reached for, and never explained. *Generated and gated through the crew, 2026-07-25; full card in [`../pipeline-runs/2026-07-25-giver/giver-persona-card.md`](../pipeline-runs/2026-07-25-giver/giver-persona-card.md).* | He will not accept care he has not paid for. | Always the one who sees how people connect. | Can't receive → can: being *claimed* unearned frees him; the player's "I see you" is the corrective. |
| **Ilsa** — the Kinbound *(f)* | Belonging is *given*: blood, family above all. **Behavior cluster:** wants her people gathered where she can see them, and holds that being hers is a fact rather than an achievement. Sets places before anyone answers, counts arrivals against a number she never says, and quietly covers a gap so nobody has to remark on it. Deflects attention onto *placement* — a chair pulled out, a spot cleared. Exact across long spans (lineage, years, whose table this is), loose across recent ones (what was promised, when, by whom) — which is precisely what lets an absence go unexamined. Warmth arrives as **inclusion**: the plate is down before anyone said you were coming, and nobody is told it was set for them. *Generated and gated through the crew, 2026-07-25; full card in [`../pipeline-runs/2026-07-25-kinbound/ilsa-persona-card.md`](../pipeline-runs/2026-07-25-kinbound/ilsa-persona-card.md).* | Family above all — loyal to blood, and slow to accept that loyalty runs both ways. | Always gathers people to a table. | *Blood is given → blood is tended.* Stays blood-first; learns only that a bond you were handed does not hold itself up. **Never arrives at chosen-family** — that stays the Found-Family Keeper's stance, and the village keeps arguing. The world still re-deals blood each life, and the Kinbound still never learns *that*. |

## Texture souls (5) — social-only, one salient signal each, no deep profile

They counter-voice the deep trio so the whole village argues *"what is belonging?"* from every corner.

| Soul | Belonging-stance | One salient signal |
|---------------------|------------------|--------------------|
| **Nell** — the Content Server *(m)* | Needed — and at peace with it (a counter-voice to the Giver) | Hums while working; never keeps score. |
| **Juno** — the Found-Family Keeper *(f)* | Belonging is who you *choose* (counter-voice to the Kinbound; the game's own thesis) | Her "family" is a patchwork of unrelated people who all found each other. Advocate for "found family". |
| **Linnet** — Half of a Pair *(f)* | The one bond, out of reach — soulmates split by timing (the pairing-mirror) | Keeps a small habit for someone now married to another — a saved seat, a route past their window. |
| **Pip** — the Wonder-Seeker *(m)* | Belonging is in shared wonder, out there to find | Drags people to see small marvels; always mid-discovery. |
| **Bex** — the Rule-Breaker *(m)* | Says "you belong" plainly — the authored exception | Names the feeling out loud where everyone else deflects. |

*Stances and salient signals are locked from the H1 roster decisions ([`../resources/phase-3-decisions_draft.md`](../resources/phase-3-decisions_draft.md)). Names and genders are settled, and both deep-soul behavior clusters are closed (2026-07-25) — Toby and Ilsa were each generated and human-gated through the crew.*

**Name and gender are fixed; role and age are re-dealt.** A soul returns each life under the same name and the same gender, so the player can recognize them — the reshuffle changes their *position* in the world, not their identity. Making name and gender re-deal too would leave behavior as the only handle, which is the Obra-Dinn-style recognition puzzle this game deliberately parked ([`../parking-lot.md`](../parking-lot.md)). The promise in [`01-concept.md`](01-concept.md) — *a friend may now be a brother* — needs a recognizable person on the other side of it.

**The cast is 4 men and 4 women.** Nell is male on purpose: the Giver is a man who cannot stop giving, which inverts the usual coding of caretaking, and his direct counter-voice being a woman serene in service would have quietly re-installed the trope the Giver exists to break. The contrast between them is *earning versus ease* — it was never gender.

## Age is a role field

Each soul carries an `age_band` alongside its `role_tag`, and it is **re-dealt every life exactly like the job** — a soul is a pattern, not a station, and not an age either. Nothing on the essence side may depend on it, so a "youthful" or "world-weary" trait is a defect. Age is what makes the reshuffle bite in a channel the roles alone don't reach: a soul who was `older` last life can be dealt `young` this one, so every deference relationship inverts while the essence holds. It is also load-bearing for ordinary dialogue — who defers to whom, who is addressed as "boy", who mentors. Without it the crew invents age terms unlicensed and no consistency check catches them.

**Three bands, all role-capable.** The range is deliberately bounded: **every band must be able to hold every role**, or the reshuffle breaks — a soul dealt "child" could not run the bakery, and the role-deal would have to route around them, which contradicts the whole premise. Village life does the rest of the work; older people here still work.

| `age_band` | Rough years | Reads as |
|---|---|---|
| `young` | late teens – late 20s | Addressed as "boy"/"girl" by elders; still proving themselves |
| `middle` | 30s – 50s | The default; peer to most of the town |
| `older` | 60s+ | Deferred to; addresses the young familiarly |

Three bands drive every address term and deference relationship without adding a band that breaks role-dealing. **Life-one assignment:** `young` — Toby, Pip · `middle` — Mara, Nell, Linnet, Bex · `older` — Ilsa, Juno.
