# Raw Claude output — Toby festival-arc C1, full Architect brief + Choice-designer graph

Engine: Claude (general-purpose subagent, blind — instructed not to read
`lantern-projects/v01/threads/toby-feast-short.md` or any file with
"feast-short" in its name). Same combined brief as the 26B trial.

## Raw response, verbatim, no edits

# PART A — Mini Architect Brief (C1)

**Reveal carried:** "The conversion" — first time the player sees Toby take a shortfall and turn it into arithmetic + a job before any feeling gets a chance to land. No prior facts assumed; the flat dough and the forty-loaf gap are established economy the player is expected to pick up cold, in-scene, not recalled.

**State of the shortfall:** Starter begged off a neighbor (offscreen, before scene opens) — the ask itself is not dramatized, only its aftermath: a borrowed crock sitting next to his own flour, tally marks already started. It covers *part* of the gap, not all of it — exact numbers ("twelve down from forty") are reserved for C2, so this scene stays deliberately vague on the remaining count.

**Sizing:** 6 choice nodes (seed default), one 3-option node for variance, one nested option (depth 2) — satisfies rule 16's "more than one device" floor for the thread as a whole.

**Constraint worth naming:** Must work stone cold — first likely contact with Toby all week. Zero gates, zero `knows()` predicates, one fallback state (the only state). No mention of the water-flask gesture as backstory — it can appear as an *examinable object* in the room (rule 6), never explained.

---

# PART B — Choice Designer Output

## Content block

**Incoming state (OS-C1-1):** Toby is at the worktable before the player has said anything. His own flour sack is open; beside it sits a crock that isn't his — someone else's culture, still faintly sour-smelling, lid balanced on top. A slate with chalk tally marks leans against the flour sack. He doesn't look up when the player enters. The refilled water flask from before sits by the door, unremarked.

**CH-C1-1 (3 options, ungated — the cold open):** The player reacts to walking in on this. *a)* `player_line` "What's this for?" (Converse/witness) — Toby answers without stopping his hands. *b)* `surface_action` Look at the tally slate (Collect/witness) — he angles it toward the player without comment, records `knowledge_flag(sees_tally)`. *c)* `player_line` "Need a hand?" (Converse/ease) — he hesitates a half-beat, then keeps working, records `bond_event(Trust, weight 2)`. All three converge at **J-1**, where Toby delivers the scene's one marked long run: the conversion itself — how he went and got the starter, what it buys, what it doesn't. (Logistics/arithmetic content; up to 75 words; placed here specifically, not at a receiving or payoff beat.)

**CH-C1-2 (2 options, ungated):** Response to the arithmetic. *a)* `player_line` "That'll hold?" (Converse/witness) — he gives a flat, honest "Some of it." *b)* `surface_action` Count the rising loaves nearby (Collect/witness) — he watches the player count, doesn't correct or confirm, records `knowledge_flag(shortfall_partial)`. Both feed **AS-C1-1**: Toby resets a proofing cloth over the dough, a small wordless action beat, no choice attached.

**CH-C1-3 (2 options, one nests):** Player offers to help directly. *a)* `surface_action` Take up the flour sack (Make/ease) — **nests** a depth-2 sub-node (CH-C1-3a: 2 options — measure by his count / measure by guess — both land on him quietly correcting the guess without naming it as correction, rejoining at `g_N3a`), records `bond_event(Intimacy, weight 2)`. *b)* `player_line` "Tell me where you're short." (Converse/witness) — he gives a number range, not the exact count (reserved for C2), records `knowledge_flag(declined_exact_count)`.

**CH-C1-4 (2 options, ungated):** Player probes the debt underneath the favor. *a)* `player_line` "What did you give her for it?" (Converse/witness) — he deflects onto the unfinished task in the room ("Ask me after the second proof"), records `knowledge_flag(deflects_on_debt)` — a flag with no reader yet in this conversation, intended for C3/C4 payoff on the conviction line. *b)* `surface_action` Glance at the flask by the door (Collect/witness) — he doesn't follow the player's eyeline, records nothing (the object stays closed — rule 6 satisfied: the flask is named as an examinable that would reopen the gesture, not explained here).

**CH-C1-5 (2 options, ungated):** He hands off a job before distress can register. *a)* `player_line` "Give it here." (Use/ease) — takes the job, records `bond_event(Trust, weight 2)` + `thread_move(toby-feast-shortfall)`. *b)* `surface_action` Reach for the second sack anyway (Make/ease) — takes initiative unasked, records `bond_event(Trust, weight 2)` + `thread_move(toby-feast-shortfall)`. Both equal weight, both move the thread — the move is the conversion completing, not which option was picked.

**CH-C1-6 (2 options, ungated — the close):** How the player leaves it. *a)* `player_line` "I'll check back after." (Converse/witness) — flat acknowledgment, records `bond_event(Trust, weight 2)`. *b)* `surface_action` Leave the flask by his elbow, refilled (Use/ease) — the deep/marked pick, mirroring his own earlier unprompted gesture back at him; he stops for exactly one beat, doesn't name it, records `bond_event(Recognition, weight 3)`. Converges at **J-END**.

**Action-slot ratio:** 2 object/action beats (OS-C1-1, AS-C1-1) across 6 choice nodes ≈ 1 per 3 — inside the stated 1-per-3-to-5 range.

**Long-run placement:** One marked long run (up to 75 words), placed at J-1 as Toby's arithmetic explanation — a logistics/instruction beat, not a receiving/thanked/seen or payoff beat. No other long run in the scene.

## Mermaid graph

```mermaid
flowchart TD
    OS1(["O-C1-1 · worktable<br>borrowed crock beside his own flour, tally slate, flask unremarked by door"])
    OS1 --> N1

    N1["CH-C1-1<br>player walks in on the arithmetic"]
    N1 --> N1a("a · Converse · witness · 'What's this for?'")
    N1 --> N1b("b · Collect · witness · Look at the tally slate")
    N1 --> N1c("c · Converse · ease · 'Need a hand?'")
    N1b --> R1b[/"flag: sees_tally"/]
    N1c --> R1c[/"bond: Trust"/]
    N1a --> J1((g1))
    R1b --> J1
    R1c --> J1
    J1 -->|"Toby: the conversion (marked long run, ≤75w, logistics/arithmetic)"| N2

    N2["CH-C1-2<br>responding to the numbers"]
    N2 --> N2a("a · Converse · witness · 'That'll hold?'")
    N2 --> N2b("b · Collect · witness · Count the rising loaves")
    N2b --> R2b[/"flag: shortfall_partial"/]
    N2a --> J2((g2))
    R2b --> J2
    J2 --> AS1

    AS1(["A-C1-1 · proofing cloth<br>Toby resets the cloth over the dough, wordless"])
    AS1 --> N3

    N3["CH-C1-3<br>offering to help"]
    N3 --> N3a("a · Make · ease · Take up the flour sack")
    N3 --> N3b("b · Converse · witness · 'Tell me where you're short.'")
    N3b --> R3b[/"flag: declined_exact_count"/]

    subgraph N3a_sub["N3a"]
        N3a1["CH-C1-3a<br>how to measure"]
        N3a1 --> N3a1a("a · Make · ease · measure by his count")
        N3a1 --> N3a1b("b · Make · ease · measure by guess")
        N3a1b --> R3a1b[/"Toby quietly corrects, unnamed"/]
        N3a1a --> gN3a(("g_N3a"))
        R3a1b --> gN3a
    end
    N3a --> N3a1
    N3a --> R3a[/"bond: Intimacy"/]

    gN3a --> J3((g3))
    R3b --> J3
    J3 --> N4

    N4["CH-C1-4<br>probing the debt"]
    N4 --> N4a("a · Converse · witness · 'What did you give her for it?'")
    N4 --> N4b("b · Collect · witness · Glance at the flask by the door")
    N4a --> R4a[/"flag: deflects_on_debt"/]
    R4a --> J4((g4))
    N4b --> J4
    J4 --> N5

    N5["CH-C1-5<br>the job lands in someone's hands"]
    N5 --> N5a("a · Use · ease · 'Give it here.'")
    N5 --> N5b("b · Make · ease · Reach for the second sack anyway")
    N5a --> R5a[/"bond: Trust<br>thread_move: toby-feast-shortfall"/]
    N5b --> R5b[/"bond: Trust<br>thread_move: toby-feast-shortfall"/]
    R5a --> J5((g5))
    R5b --> J5
    J5 --> N6

    N6["CH-C1-6<br>how the player leaves it"]
    N6 --> N6a("a · Converse · witness · 'I'll check back after.'")
    N6 --> N6b("b · Use · ease · Leave the flask by his elbow, refilled")
    N6a --> R6a[/"bond: Trust"/]
    N6b --> R6b[/"bond: Recognition (marked)"/]
    R6a --> JEND(("g_END"))
    R6b --> JEND
```
