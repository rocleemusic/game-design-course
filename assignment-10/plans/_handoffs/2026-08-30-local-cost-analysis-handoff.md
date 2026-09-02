# Handoff — local vs. cloud cost-analysis numbers for capstone

Paste the block at the bottom into a new session if picking this up cold.
Everything above it is context for a human deciding what to trust and what
to redo.

**Written 2026-08-30**

This is for the capstone's cost-analysis section: Claude (cloud, metered)
vs. running narrative-content generation locally through koboldcpp. The
ask was three raw numbers — local hours, watts, $/kWh — handed back
uncombined so the dollar math happens on the other end.

---

## What happened, in order

1. **Tried to reconstruct total local generation time from existing logs.**
   Summed every `Total:Xs` line across `assignments/assignment-8-icm/
   _kobold-tests/logs/*.log` (266 calls, 897.2s) and the three
   `pipeline-runs/*/koboldcpp-server.log` files (21 calls, 892.9s).
   **Combined: 287 calls, 1790.1s ≈ 0.497 hours.** This is a documented
   floor, not a total — the `pipeline-runs` logs are fragments from around
   server restarts, confirmed against `_last_run_summary.json` for the
   2026-08-25 full-content-generation run, which shows 95 successful calls
   against only 3 `Total:` lines captured in its log. No fuller log exists
   anywhere else on this machine: `D:\models\` has no stray `.log` files,
   there's no bash history, and PowerShell history has zero `koboldcpp`
   entries.

2. **Checked GPU power draw empirically instead of trusting rated TDP.**
   Ran two clean, isolated sessions — model loaded fresh, 5 generation
   calls each (300-token cap, varied prompts to avoid koboldcpp's
   prompt-cache dedup), `nvidia-smi --query-gpu=power.draw` sampled once a
   second throughout, server killed after. Log/response files and raw GPU
   CSVs are in `D:\kobold-test\` on this machine (not in the repo).

   | Model | Avg draw during gen | Peak | Throughput |
   |---|---|---|---|
   | Gemma-The-Writer-Mighty-Sword-9B Q4 | 34.4W | 45.5W | ~23 tok/s |
   | **Muse-12B Q4** | **173.7W** | **189.0W** | **~50 tok/s** |

   Card is an RTX 4070 Super, 220W rated TDP. The 6x spread between two
   models on identical hardware/settings means "GPU power draw" isn't a
   fixed number for this rig — it depends heavily on the model's
   architecture, not just whether generation is happening. Mighty-Sword's
   low draw is likely because single-sequence llama.cpp inference is
   memory-bandwidth-bound rather than compute-bound for that architecture,
   so the GPU's compute cores sit mostly idle even fully offloaded.

3. **Checked which models the actual project ran, to see which power
   number is representative.** The single biggest real production run
   (`2026-08-25-full-content-generation`, 95 calls — the largest batch
   in the whole project) used `gemma4-26b-fiction-bf16.Q4_K_M.gguf` with
   `--moecpu 999`, which pushes MoE expert layers to CPU, not GPU. That
   model was deliberately **not measured** this session — Roc's call,
   since Muse-12B is the model actually preferred going forward. Flagging
   anyway: the 95-call run that shipped the most content ran on a
   different model with a different (partially CPU-bound) power profile
   than the number below, so if anyone wants a fully representative
   blended average later, gemma4-26b under `--moecpu 999` still needs
   its own GPU+CPU measurement pass — it wasn't skipped for a technical
   reason, just deprioritized.

4. **Decision, per Roc:** use the **Muse-12B measured number** for the
   local side of the cost comparison. Don't use TDP, don't use the
   9B model's number, don't wait on gemma4-26b.

---

## The three raw numbers for the capstone

- **Total local generation hours:** ~0.497 hours, and this is a known
  floor from truncated logs, not the true total. If a defensible total
  matters more than a quick number, the better move (discussed but not
  done) is: take the clean-session tokens/sec rate, multiply by total
  call counts from every `_last_run_summary.json` across all pipeline
  runs, and state that as an extrapolation methodology in the report
  rather than presenting the log-sum as complete.
- **GPU power draw:** 173.7W average / 189.0W peak, **measured**
  (Muse-12B, RTX 4070 Super, 5-call clean session, 1-second
  `nvidia-smi` sampling). Not TDP, not estimated.
- **Electricity rate ($/kWh):** not obtained. No utility bill was
  available on this machine and no lookup was done. Still needs a
  number from Roc or a regional-estimate lookup — flagged, not
  fabricated.

## Open items for whoever picks this up

- $/kWh rate still missing — get it from Roc or do a regional-estimate
  web lookup and label it clearly as an estimate.
- The 0.497h figure is a floor. Decide whether the report states it as a
  floor with a caveat, or gets replaced with the extrapolated-total
  methodology above.
- gemma4-26b + `--moecpu 999` is unmeasured. Only matters if the report
  later wants a number representative of the actual biggest production
  run rather than Roc's preferred model.

---

## Resume block

```
Continuing the capstone cost-analysis local-vs-cloud comparison for
game-project. Local numbers so far: GPU draw 173.7W avg / 189.0W peak
(Muse-12B, measured via nvidia-smi during a clean 5-call koboldcpp
session). Total local generation hours is only a floor (~0.497h) from
truncated/partial logs — see plans/_handoffs/2026-08-30-local-cost-
analysis-handoff.md for the full method and caveats. Still need:
$/kWh rate, and a decision on whether to state hours as a floor or
extrapolate from _last_run_summary.json call counts across all
pipeline-runs. gemma4-26b + --moecpu 999 (the model that actually ran
the biggest production batch) was deliberately left unmeasured per
Roc's call to stick with Muse-12B.
```
