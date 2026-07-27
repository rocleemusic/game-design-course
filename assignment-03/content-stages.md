# Content Generation — Stage Order

The production order for a slice's content: which content class we build, in what sequence, and how each new class is run back through the arc to surface interactions. This is the **macro plan**; [`pipeline.md`](pipeline.md) is the **micro procedure** each stage runs its batch through; the arc doc (e.g. [`arc-festival-slice.md`](arc-festival-slice.md)) is the steering substrate stages 2–7 read.

## Why staged

- **Items are derived, not authored top-down.** They fall out of what spells actually need, so nothing is generated that nothing uses.
- **Each class is run back through the arc + the already-generated NPCs**, so interactions are discovered against real context rather than guessed.

```mermaid
flowchart LR
    S1["<b>1 · Arc</b><br/>steering layer"]
    S2["<b>2 · NPCs</b><br/>cards · echoes"]
    S3["<b>3 · Spells</b><br/>authored list"]
    S4["<b>4 · Components</b><br/>→ items, derived"]
    S5["<b>5 · Item schema</b><br/>material × category"]
    S6["<b>6 · Key items</b><br/>soul-tied"]
    S7["<b>7 · Cross-pass</b><br/>spells × items × NPCs"]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7

    SUB[("<b>Substrate</b><br/>arc doc + generated cast")]
    S1 -.-> SUB
    S2 -.-> SUB
    SUB -. "run back through" .-> S3
    SUB -. "run back through" .-> S6
    SUB -. "read by" .-> S7

    classDef done fill:#90A67C22,stroke:#4E6B4F,stroke-width:2px
    classDef now fill:#E3B26A33,stroke:#CE8F45,stroke-width:2px
    classDef sub fill:#6E879422,stroke:#435966,stroke-dasharray:4 3
    class S1 done
    class S2 now
    class SUB sub
```

*Green = done (arc ratified) · gold = current stage · dashed = the reusable substrate every later class is checked against.*

## The stages

1. **Arc** — write the steering layer (World Truths, Arc Question, spines, threads, anti-goals, generative tables). Nothing generates without it. → an arc doc.
2. **NPCs** — generate the souls: persona cards (essence/role), arc-spine notes, echo templates. Runs `pipeline.md` steps 2–4. **← current stage.**
3. **Spells** — author the spell list we want; run it through the arc + NPCs for potential interactions (receiver-determined outcomes per soul).
4. **Components → Items (derived)** — each spell's components become the items that must exist. Bottom-up; no orphan items.
5. **Item schema** — decide the item schema (material × category) and how items run through the pipeline.
6. **Key items** — author the meaningful items we want, **tie each to a soul** (the H3 mementos / echo-carriers), and run them through the arc + NPCs again for interactions. Top-down.
7. **Final cross-pass** — compare **spells × items × NPCs** to enumerate every possible reaction. The receiver-determined model taken to completion.

## Two kinds of items

- **Derived** (stage 4) — components spells need; mechanical, bottom-up.
- **Key** (stage 6) — author-chosen, soul-tied; the narrative echo-carriers (H3 mementos / keepsakes).

Both land in the same interaction space at stage 7.

## The reusable substrate

The arc + the generated NPCs is what every later class (spells at 3, key items at 6) is run back through. The arc doc is written once; the cast accretes; each new content class is checked against both — and the final pass reads all three axes together.
