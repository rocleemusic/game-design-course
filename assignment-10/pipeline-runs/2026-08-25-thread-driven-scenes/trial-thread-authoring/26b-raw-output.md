# Raw 26B output — Toby festival-arc thread trial

Model: `gemma4-26b-fiction-bf16.Q4_K_M.gguf`, `--moecpu 999`, koboldcpp
`http://localhost:5001/v1/chat/completions`, temp 1.0 / top_p 1.0 / min_p 0.10,
max_tokens 500. System+user split, same brief as the Claude trial (Toby's
essence fields, the Baker mishap pool, thread-registry-schema.md's slot-a
rules and five tests), blind to `cast/toby-baker-threads.md`.

## Raw response, verbatim, no edits

```
toby-feast-needs-many | the Baker's feast can't be finished alone | a shortage is announced to the crowd | a guest offers a handful of yeast or a sack of flour and Toby must accept the debt of the contribution | situation | the fear that being needed is the only way to be accepted | CANDIDATE
```

That's the model's complete output — one pipe-delimited line, matching the
7-column order requested (Thread · The open question · Moves when · Action /
conflict · Type · Reveals · Status). No preamble, no markdown table, no
extra commentary — it followed the requested format exactly, even though
the *content* of two of those columns (open question, Reveals) is thin
against the schema's own tests, as noted in `toby-festival-arc-trial.md`.
