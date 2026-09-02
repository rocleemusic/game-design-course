#!/usr/bin/env python3
"""One-off: compute final per-model stats for RESULTS.md, using only the
LAST run-log block for each (model, group) pair (so a discarded/contaminated
earlier attempt doesn't pollute the numbers), cross-checked against the
final raw JSON files (source of truth for what actually shipped)."""
import json, os, re

RUN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(RUN_DIR, "run-log.md")
RAW = os.path.join(RUN_DIR, "lines", "_raw")

text = open(LOG, encoding="utf-8").read()
blocks = re.split(r"\n## Phase 2 run: model=(\w+) group=(\w+) started [^\n]+\n", text)
# blocks[0] is preamble; then triples of (model, group, body) until next split... actually re.split with groups
# gives: [pre, model1, group1, body1, model2, group2, body2, ...]
runs = {}
for i in range(1, len(blocks), 3):
    model, group, body = blocks[i], blocks[i+1], blocks[i+2]
    runs[(model, group)] = body  # last one wins (overwrites earlier discarded runs)

print(f"{'model':<12}{'group':<8}{'success':<9}{'leakage_retry':<15}{'net_failed':<12}{'skipped':<9}")
for (model, group), body in runs.items():
    succ = len(re.findall(r"attempt \d+/3: SUCCESS", body))
    leak = len(re.findall(r"attempt \d+/3: LEAKAGE", body))
    netf = len(re.findall(r"attempt \d+/3: FAILED", body))
    skip = len(re.findall(r"SKIPPED after", body))
    print(f"{model:<12}{group:<8}{succ:<9}{leak:<15}{netf:<12}{skip:<9}")

print("\n--- raw JSON ok/fail per model (final shipped state) ---")
for model_dir in sorted(os.listdir(RAW)):
    mp = os.path.join(RAW, model_dir)
    if not os.path.isdir(mp):
        continue
    ok = 0
    fail = 0
    for fname in os.listdir(mp):
        data = json.load(open(os.path.join(mp, fname), encoding="utf-8"))
        for slot, entry in data.items():
            if entry.get("ok"):
                ok += 1
            else:
                fail += 1
    print(f"{model_dir:<12} ok={ok:<5} fail={fail:<5} files={len(os.listdir(mp))}")
