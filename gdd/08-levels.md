# Levels

Town, Forest, Festival Grounds, and the Home Hub — what each screen is for and gates. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. Painted-backdrop looks and generation prompts for the interiors here — the Tavern and the NPC homes — live in [`../locations/locations-appearance.md`](../locations/locations-appearance.md).

**Who is on a screen is decided by role, not by screen.** A soul is placed at their role's workplace, in that role's time blocks — the table lives in [`07-cast.md`](07-cast.md#the-role-pool) (ruled 2026-08-13 — Roc). So this file never names a soul: the Workshop is where the Blacksmith is, whoever is holding Blacksmith this life.

## Town

The festival's home — one scene plus the Square.

- **Square** *(start)* — under the Lantern Arch, which ages across the years; where you arrive.
- **Town scene** — the lived-in heart: market stalls, the commons and well, and the main NPCs at their work (a blacksmith's bench, a baker's counter). NPC homes open here at a certain bond level (a running social state, which the **Strategy over dexterity** pillar allows as a gate — see [`02-pillars.md`](02-pillars.md)). The Tavern corner opens in the evening.

## Forest

One screen plus two knowledge-gated unlocks.

- **Forager's Clearing** *(start)* — Onboarding the first time; a normal screen thereafter.
- **Unlock 1** — a path cleared by a spell (e.g. ignite a dry hedge).
- **Unlock 2** — a secret path learned from an NPC.

## Festival Grounds

Open from the start of the cycle — reachable like any other town screen, but a low-weight one, and never a day-opening pick. It carries two roles:

- **During the week.** An ordinary, rarely-drawn screen. Whatever story NPC the guarantee floor places there is playable like anywhere else.
- **On the last night.** The stage of the final sequence (RULED 2026-08-01, the day-5 exception in [`03-core-loop.md`](03-core-loop.md)): once the player chooses to go to Festival night from the last day's home hub, this becomes the only screen — no move budget, no exits — and every NPC with a festival-night scene is playable here before the vignette starts.

## Festival Vignette / Final Screen

Two screens minted for the final sequence (RULED 2026-08-01; `plans/2026-08-01-festival-night-transition-plan.md`), both real enough for Lantern to review like any other screen, both entered by the story alone — never a day-opening pick, never a calendar destination:

- **Festival Vignette.** The closing beat once every festival-night scene on the Festival Grounds has been played, or the moment the player chooses to start it early. Placeholder prose until the prose pass; leads straight to the Final Screen.
- **Final Screen.** Summary, results, and the prompt to restart. The results slots (festival tier, bonds, threads) are named as placeholders until `role_goals_advanced` compiles. The only way a life ends now — there is no return to the day cycle without starting a new game.

## Home Hub

Two spaces sharing one asset set:

**The Home Hub is not a forage point** (ruled 2026-08-04 — Roc). It is where you bank and decorate, not where you gather; no item may draw a source location from it ([`05-collectibles.md`](05-collectibles.md)).

- **In-game home.** Your home during a life — return at day's end, bank what fits the satchel, and decorate it. It resets empty at the start of each new life.
- **Meta-hub (main menu).** The role-select screen doubles as your permanent collection: every item *held* and sound *heard* is recorded, completion tracked across all lives, and each life's new finds unlock as display pieces you arrange. It shares the home's decoration assets, but its pieces are display-only — never withdrawable into play.
