# SPB-temper — Blacksmith spell beat: temper

## Part A — Mini Architect Brief

**Reveal carried:** First sight of `temper`, via Ilsa quenching a glowing
piece at the bench (`content/magic/temper.json` `learn_source`).
Components: `item_river_stone` + `item_spring_water`. State-dependent on
the `forge_billet` receiver — glowing hot hardens evenly; cold, no_effect.

**State:** Ordinary workday, generic.

**Sizing:** 6 beats — 2 setting beats, one 3-option choice node, one close.

**Constraint worth naming:** The clue is the quench motion and the
state-dependence itself (has to be hot) — never a spoken phrase-as-
instruction.

---

## Part B — Choice Designer Output

### Content block

**Incoming state (O-SPB-TMP-1):** The forge bench. A billet glows from the
fire, tongs holding it steady. A trough of spring water sits ready beside
the anvil.

**A-SPB-TMP-1:** Ilsa turns the billet once more in the coals, checking
the color, then swings it to the anvil — the state-dependent clue: it has
to be hot for this to matter at all.

**CH-SPB-TMP-1 (3 options, ungated):**
- **a · Converse · witness** — `player_line`: "Does it matter how hot?" —
  Ilsa: "Glowing, not just warm." Flat, exact. Records `knowledge_flag
  (temper_seen)`.
- **b · Use · ease** — `surface_action`: hands over a second river stone,
  already sitting warm near the fire, for Ilsa to work on the same way.
  It hardens evenly under her hands. Records `knowledge_flag
  (temper_attempted)` + `bond_event(Trust, weight 2)`.
- **c · Collect · witness** — `surface_action`: picks up a stick lying
  nearby and holds it toward the quench trough instead — wood takes no
  temper, nothing happens (per the `stick` receiver's no_effect). Records
  `knowledge_flag(temper_boundary_seen)`.

Converges at **J-SPB-TMP-1**.

**Close (AS-SPB-TMP-1):** The worked piece hisses in the water and holds
its shape. Ilsa checks the edge with her thumb, sets it aside.

**Action-slot ratio:** 2 action beats across the scene ≈ within range.

**Long-run placement:** None.

**Equal weight:** a explains, b tries and succeeds, c finds the boundary
on the wrong material — all legitimate, none punished.

### Mermaid graph

```mermaid
flowchart TD
    O1(["O-SPB-TMP-1 · forge bench<br>billet glowing, quench trough ready"])
    O1 --> A1
    A1(["A-SPB-TMP-1 · Ilsa checks the billet's color, swings it to the anvil"])
    A1 --> N1

    N1["CH-SPB-TMP-1<br>the player's move at the glowing billet"]
    N1 --> N1a("a · Converse · witness · 'Does it matter how hot?'")
    N1 --> N1b("b · Use · ease · hands over a second warm river stone")
    N1 --> N1c("c · Collect · witness · holds a stick toward the quench trough instead")
    N1a --> R1a[/"flag: temper_seen"/]
    N1b --> R1b[/"flag: temper_attempted<br>bond: Trust"/]
    N1c --> R1c[/"flag: temper_boundary_seen"/]
    R1a --> J1((g))
    R1b --> J1
    R1c --> J1
    J1 --> AS1

    AS1(["AS-SPB-TMP-1 · the worked piece hisses in the water and holds its shape"])
```

**Self-verify:** parses clean, options match prose, genuine gather, no
phrase spoken as instruction, component table respected.
