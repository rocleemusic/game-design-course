#!/usr/bin/env python3
"""
Assembles lines/<id>-comparison.md files from the raw per-model JSON in
lines/_raw/<model_label>/<scene_id>.json.

Run after all model passes for a group are complete.

Usage: python assemble_comparison.py
"""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RUN_DIR = os.path.dirname(SCRIPT_DIR)
STRUCTURE_DIR = os.path.join(RUN_DIR, "structure")
RAW_DIR = os.path.join(RUN_DIR, "lines", "_raw")
OUT_DIR = os.path.join(RUN_DIR, "lines")

NIGHT_MODELS = ["muse12b", "violetlotus"]
CONV_MODELS = ["styletune", "violetlotus", "crimson", "gemma26b"]

NIGHT_PREFIXES = ("NGT-",)
CONV_PREFIXES = ("ENC-", "SPB-")


def safe_write(path, content):
    abspath = os.path.abspath(path)
    if not abspath.startswith(os.path.abspath(RUN_DIR) + os.sep):
        raise RuntimeError(f"REFUSING to write outside run dir: {abspath}")
    os.makedirs(os.path.dirname(abspath), exist_ok=True)
    with open(abspath, "w", encoding="utf-8") as f:
        f.write(content)


def read_structure(scene_id):
    path = os.path.join(STRUCTURE_DIR, f"{scene_id}.md")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def load_raw(model_label, scene_id):
    path = os.path.join(RAW_DIR, model_label, f"{scene_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_scene_comparison(scene_id, models):
    structure_text = read_structure(scene_id)
    lines = [f"# {scene_id} — line comparison", "", "## Approved structure (Phase 1)", "",
             "<details><summary>Structure (click to expand)</summary>", "", structure_text, "",
             "</details>", "", "## Generated lines, by model", ""]

    slot_labels = ["setup", "option_a", "option_b", "option_c"]
    per_model_data = {}
    any_data = False
    for m in models:
        raw = load_raw(m, scene_id)
        per_model_data[m] = raw
        if raw:
            any_data = True

    if not any_data:
        lines.append("_No generated output found for this scene yet._")
        return "\n".join(lines) + "\n"

    for slot in slot_labels:
        lines.append(f"### {slot}")
        lines.append("")
        lines.append("| Model | Word count | Text |")
        lines.append("|---|---|---|")
        for m in models:
            raw = per_model_data.get(m)
            if not raw or slot not in raw:
                lines.append(f"| {m} | — | _not generated_ |")
                continue
            entry = raw[slot]
            if not entry.get("ok"):
                lines.append(f"| {m} | — | **FAILED**: {entry.get('err', 'unknown error')} |")
                continue
            text = (entry.get("text") or "").replace("\n", "<br>").replace("|", "\\|")
            wc = entry.get("wc", 0)
            lines.append(f"| {m} | {wc} | {text} |")
        lines.append("")

    return "\n".join(lines) + "\n"


def build_intro_comparison(models):
    lines = ["# INT-1 — line comparison", "", "Intro scene, unchanged shape (2 bounded calls). "
             "No structure/ file — this unit's shape is fixed by the dialogue inventory's method "
             "note, not a Phase 1 structure.", "", "## Generated lines, by model", ""]
    for beat, label in (("beat_a", "Beat A — arrival + festival stakes"),
                         ("beat_b", "Beat B — greeting + name entry")):
        lines.append(f"### {label}")
        lines.append("")
        lines.append("| Model | Word count | Text |")
        lines.append("|---|---|---|")
        for m in models:
            path = os.path.join(RAW_DIR, m, "INT-1.json")
            if not os.path.exists(path):
                lines.append(f"| {m} | — | _not generated_ |")
                continue
            data = json.load(open(path, "r", encoding="utf-8"))
            entry = data.get(beat, {})
            if not entry.get("ok"):
                lines.append(f"| {m} | — | **FAILED**: {entry.get('err', 'unknown error')} |")
                continue
            text = (entry.get("text") or "").replace("\n", "<br>").replace("|", "\\|")
            wc = entry.get("wc", 0)
            lines.append(f"| {m} | {wc} | {text} |")
        lines.append("")
    return "\n".join(lines) + "\n"


def main():
    written = 0
    missing = []

    # INT-1
    content = build_intro_comparison(NIGHT_MODELS)
    safe_write(os.path.join(OUT_DIR, "INT-1-comparison.md"), content)
    written += 1

    for fname in sorted(os.listdir(STRUCTURE_DIR)):
        if not fname.endswith(".md"):
            continue
        scene_id = fname[:-3]
        if scene_id.startswith(NIGHT_PREFIXES):
            models = NIGHT_MODELS
        elif scene_id.startswith(CONV_PREFIXES):
            models = CONV_MODELS
        else:
            continue
        content = build_scene_comparison(scene_id, models)
        safe_write(os.path.join(OUT_DIR, f"{scene_id}-comparison.md"), content)
        written += 1
        if "_No generated output found" in content:
            missing.append(scene_id)

    print(f"Wrote {written} comparison files.")
    if missing:
        print(f"{len(missing)} scenes have NO generated output at all: {missing}")


if __name__ == "__main__":
    main()
