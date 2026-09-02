#!/usr/bin/env python3
"""
Phase 2 line generation — thread-driven scenes, 2026-08-25.

Reads the Phase-1-approved structures in ../structure/*.md (25 files: 9 ENC,
3 NGT, 13 SPB) and generates dialogue-bearing line text for each scene's
slots against whichever local model koboldcpp currently has loaded.

Run ONCE PER MODEL (koboldcpp must already be up on localhost:5001 serving
that model — see ../../assignment-8-icm/_kobold-tests/README.md for the
launch pattern). Raw per-model output accumulates in lines/_raw/<model_label>/
as one JSON file per scene; assemble_comparison.py later merges all models'
raw output into the final lines/<id>-comparison.md files.

Usage:
  python generate_lines.py <model_label> <group>

  model_label: short label used in output filenames (muse12b, violetlotus,
               styletune, crimson, gemma26b) — must match whatever model is
               actually loaded in koboldcpp, or files will lie about their
               source (same discipline as the kobold-tests README).
  group:       "night"  -> INT-1 + NGT-* (2-variant category)
               "conv"   -> ENC-* + SPB-* (4-variant category)
               "greetings" -> the 5 new GRT-*-generic texture rows (1 variant)

Writes ONLY under pipeline-runs/2026-08-25-thread-driven-scenes/ — never
touches cast/, content/, or gdd/15-dialogue-inventory.md beyond what Phase 0
already edited.
"""

import json
import os
import re
import sys
import time
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RUN_DIR = os.path.dirname(SCRIPT_DIR)
GAME_ROOT = os.path.abspath(os.path.join(RUN_DIR, "..", ".."))
CAST_DIR = os.path.join(GAME_ROOT, "cast")
STRUCTURE_DIR = os.path.join(RUN_DIR, "structure")
RAW_DIR = os.path.join(RUN_DIR, "lines", "_raw")
RUN_LOG = os.path.join(RUN_DIR, "run-log.md")

os.makedirs(RAW_DIR, exist_ok=True)

def safe_write(path, content):
    abspath = os.path.abspath(path)
    if not abspath.startswith(os.path.abspath(RUN_DIR) + os.sep):
        raise RuntimeError(f"REFUSING to write outside run dir: {abspath}")
    os.makedirs(os.path.dirname(abspath), exist_ok=True)
    with open(abspath, "w", encoding="utf-8") as f:
        f.write(content)

# ---------------------------------------------------------------------------
# Model call (same contract as generate_all.py / kobold-tests README)
# ---------------------------------------------------------------------------

ENDPOINT = "http://localhost:5001/v1/chat/completions"
MAX_ATTEMPTS = 3
TIMEOUT_S = 240

def call_model(system_prompt, user_prompt, max_tokens=150):
    body = {
        "model": "local",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 1.0,
        "top_p": 1.0,
        "min_p": 0.10,
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"].strip()

LEAKAGE_MARKERS = ("===", "**", "Records ", "records `", "player_line:", "surface_action:",
                    "slot_type:", "scene_context", "WHAT TO WRITE", "CH-", "AS-", "O-NGT",
                    "O-ENC", "O-SPB", "A-NGT", "A-ENC", "A-SPB")

BACKTICK_ID_RE = re.compile(r"`[a-z][a-z0-9_]{3,}`")

ALL_CAST_NAMES = ("Toby", "Ilsa", "Mara", "Linnet", "Nell", "Juno", "Pip", "Bex",
                   "Ovin", "Adren", "Bram")

def detect_leakage(text, banned_names=()):
    """Return a reason string if the text looks like it echoed structural
    scaffolding, drifted into second-person player address, or introduced a
    named character not present in this scene's own notes, else None."""
    for marker in LEAKAGE_MARKERS:
        if marker in text:
            return f"structural marker leaked into output: {marker!r}"
    m = BACKTICK_ID_RE.search(text)
    if m:
        return f"backtick-wrapped internal id leaked into output: {m.group(0)!r}"
    # Count "you/your" tokens OUTSIDE quoted dialogue only — inside quotes an
    # NPC legitimately addresses the player as "you" ("You'll sit here.").
    # It's narrator prose slipping into second person that's the defect.
    unquoted = re.sub(r'"[^"]*"', " ", text)
    you_count = len(re.findall(r"\byou\b|\byour\b|\byou're\b|\byou'll\b|\byou've\b", unquoted, re.IGNORECASE))
    word_count = max(len(text.split()), 1)
    if you_count >= 2 and you_count / word_count > 0.015:
        return f"second-person narration detected ({you_count} you/your tokens outside quotes) — narrator/action beats are third-person only"
    for name in banned_names:
        if re.search(r"\b" + re.escape(name) + r"\b", text):
            return f"out-of-scene character invented: {name!r} is not in this scene's notes"
    return None

LEAKAGE_REGUARD = (
    "\n\n=== HARD CONSTRAINT, RESTATED (a prior attempt violated this) ===\n"
    "Your ENTIRE output must be finished third-person narrative prose only — a narrator beat "
    "plus any quoted spoken line(s). Do NOT include: any structural id (CH-, O-, A-, AS-, "
    "SPB-, ENC-, NGT-), any bolded header, any line starting 'Records' or naming "
    "bond_event/knowledge_flag/thread_move, any literal 'player_line:' or 'surface_action:' "
    "label, any restated instruction text, or the string '==='. Do NOT address the reader as "
    "'you' or 'your' — every NPC and narrator beat is third-person about the character, never "
    "second-person to the player. Output ONLY the finished prose, nothing else."
)

def generate_with_retry(unit_id, system_prompt, user_prompt, max_tokens, log_fh, check_leakage=True, banned_names=()):
    last_err = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        t0 = time.time()
        this_user_prompt = user_prompt if attempt == 1 else user_prompt + LEAKAGE_REGUARD
        try:
            text = call_model(system_prompt, this_user_prompt, max_tokens=max_tokens)
            elapsed = time.time() - t0
            wc = len(text.split())
            if check_leakage:
                leak = detect_leakage(text, banned_names=banned_names)
                if leak:
                    log_fh.write(f"- **{unit_id}** attempt {attempt}/{MAX_ATTEMPTS}: LEAKAGE ({elapsed:.1f}s, {wc} words) - {leak}\n")
                    log_fh.flush()
                    last_err = f"leakage: {leak}"
                    time.sleep(1)
                    continue
            log_fh.write(f"- **{unit_id}** attempt {attempt}/{MAX_ATTEMPTS}: SUCCESS ({elapsed:.1f}s, {wc} words)\n")
            log_fh.flush()
            return text, wc, True, None
        except Exception as e:
            elapsed = time.time() - t0
            last_err = f"{type(e).__name__}: {e}"
            log_fh.write(f"- **{unit_id}** attempt {attempt}/{MAX_ATTEMPTS}: FAILED ({elapsed:.1f}s) - {last_err}\n")
            log_fh.flush()
            time.sleep(2)
    log_fh.write(f"- **{unit_id}** SKIPPED after {MAX_ATTEMPTS} failed attempts. Last error: {last_err}\n")
    log_fh.flush()
    return None, 0, False, last_err

# ---------------------------------------------------------------------------
# Cast card loading (live, never hand-copied)
# ---------------------------------------------------------------------------

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def parse_table_field(card_text, field_name):
    pattern = re.compile(r"^\|\s*`" + re.escape(field_name) + r"`\s*\|(.*)\|\s*$", re.MULTILINE)
    m = pattern.search(card_text)
    return m.group(1).strip() if m else None

def extract_section(card_text, heading):
    idx = card_text.find(heading)
    if idx == -1:
        return None
    rest = card_text[idx + len(heading):]
    lines = rest.split("\n")
    collected = []
    for i, line in enumerate(lines):
        if i == 0:
            collected.append(line)
            continue
        if line.strip().startswith("### ") or line.strip().startswith("## "):
            break
        collected.append(line)
    section = "\n".join(collected).strip()
    return "\n".join(re.sub(r"^>\s?", "", l) for l in section.split("\n")).strip()

_cast_cache = {}

def load_cast(soul):
    if soul in _cast_cache:
        return _cast_cache[soul]
    path = os.path.join(CAST_DIR, f"{soul}.md")
    text = read_file(path)
    essence = parse_table_field(text, "essence_descriptor")
    voice = extract_section(text, "### `voice_register`")
    if not essence or not voice:
        raise RuntimeError(f"Failed to parse essence_descriptor/voice_register from {path}")
    _cast_cache[soul] = (essence, voice)
    return essence, voice

WALKON_VOICE = (
    "This speaker is a WALK-ON — no persona card, no essence, no arc. Per "
    "narrative-pipeline/register.md's walk-on band: run longer and warmer "
    "than a deep soul (15-30 words is comfortable), explain themselves "
    "plainly, may state feelings directly (pleased, worried, grateful) "
    "since they have nothing to withhold. Still obey the ceilings and plain-"
    "language rule — looser is not license to invent lore."
)

# ---------------------------------------------------------------------------
# Guards
# ---------------------------------------------------------------------------

ANTI_COPY_GUARD = (
    "Any quoted example text in the scene context below is a GIST of intent, "
    "not draft wording to copy. Write a fresh line in voice; never output a "
    "quoted example verbatim or near-verbatim."
)
ANTI_INVENTION_GUARD = (
    "Never introduce a named character who is not already present in the "
    "background notes for THIS scene. This scene has a fixed, small cast — "
    "usually one soul plus the player — and no one else. Do not add Toby, "
    "Ilsa, Mara, Ovin, Adren, Bex, or anyone else unless the notes for this "
    "specific scene already name them. If a named figure appears with no "
    "relationship, history, or backstory stated, that figure exists ONLY as "
    "already written — do not invent a relationship, history, explanation, "
    "or new scene involving them. Ovin specifically: if the notes mention "
    "him, the ONLY permitted line about him is 'That was Ovin's, before.' — "
    "no elaboration, ever."
)
BANNED_VOCAB_GUARD = (
    "Never use 'remember', 'memory', 'remembers', or 'forget' describing how "
    "a spell, the festival, or an object works. Describe outcomes only."
)

SLOT_INSTRUCTION = (
    "You are the Content/Dialogue Agent for a cozy narrative game. You are "
    "given an ALREADY-APPROVED scene structure (beats, options, gists) "
    "authored by a separate Architect/Choice-designer pass. Your ONLY job is "
    "to write the actual line text for ONE requested slot, writing INTO the "
    "fixed shape rather than inventing new structure. Return ONLY the "
    "line(s) requested — a short third-person action beat (one sentence) "
    "plus any spoken line(s) in quotes, or a bracketed [action] beat with no "
    "quotes if the slot is non-dialogue. No preamble, no meta-commentary, no "
    "restating the instructions.\n\n"
    "Ceilings: NPC dialogue median 20-50 words, 75-word hard ceiling (unless "
    "the scene structure marks a specific line as the sanctioned exception). "
    "player_line (the human player's spoken option): 12-word hard ceiling, "
    "no exceptions. action/object beats: ~9-11 words median, 60-word ceiling.\n\n"
    "CRITICAL FORMAT RULE: the background notes you are given contain "
    "structural scaffolding (ids like CH-/O-/A-, bold headers, 'Records ...' "
    "lines naming bond_event/knowledge_flag/thread_move, labels like "
    "'player_line:'/'surface_action:'). None of that is prose. Never copy, "
    "quote, or echo any of it into your answer — read it only to understand "
    "the beat, then write plain finished narrative prose. And every beat is "
    "THIRD-PERSON — narrator describing the character ('Toby sets the tray "
    "down. \"Yeah.\"') — never second-person address to the player ('you "
    "set the tray down').\n\n"
    "THE PLAYER CHARACTER: refer to them ONLY as 'the player' — never invent "
    "a name for them, and never substitute an NPC (a soul from the cast) as "
    "the actor performing an action the notes attribute to the player. If "
    "the notes describe something the player does or says, the player does "
    "or says it — do not reassign it to Toby, Ilsa, Mara, or anyone else "
    "named in the scene. In the notes, an option's own action or deed (a "
    "surface_action, phrased as a bare verb with no stated subject, e.g. "
    "'quietly takes the second place') is something the PLAYER does, unless "
    "the notes explicitly name a different actor for it."
)

def build_system(soul_or_none, is_player_line=False):
    parts = [SLOT_INSTRUCTION]
    if is_player_line:
        parts.append(
            "This slot is the PLAYER's own spoken line (player_line), not an "
            "NPC. Voice: plain, exact about what-is, vague about what-it-"
            "means, curiosity as the signature. Wryness is fine. Ceiling: 12 "
            "words. Never a labeled feeling — the actual words a person "
            "would say."
        )
    elif soul_or_none is None:
        parts.append(WALKON_VOICE)
    else:
        essence, voice = load_cast(soul_or_none)
        parts.append(f"This soul's essence:\n{essence}\n\nThis soul's voice:\n{voice}")
    parts.append(ANTI_COPY_GUARD)
    parts.append(ANTI_INVENTION_GUARD)
    parts.append(BANNED_VOCAB_GUARD)
    return "\n\n".join(parts)

def build_user(slot_label, scene_context, ask):
    return (
        f"Background notes for your understanding only (an approved scene structure's "
        f"beat descriptions, node ids like CH-/O-/A-, and which flags each option records). "
        f"These are NOT text to output. Never repeat, quote, paraphrase-as-heading, or echo "
        f"any id, bold label, or 'Records ...' line from these notes in your answer — read "
        f"them only to understand what happens, then write fresh finished prose describing it.\n\n"
        f"{scene_context}\n\n"
        f"Your task for the '{slot_label}' slot: {ask}\n\n"
        f"Reminder: output ONLY the finished third-person narrative prose (a short action beat "
        f"plus any quoted spoken line), nothing else — no ids, no headers, no restated notes, "
        f"no second-person 'you'/'your' address to the player."
    )

# ---------------------------------------------------------------------------
# Structure file parsing
# ---------------------------------------------------------------------------

def extract_content_block(structure_text):
    """Return the '### Content block' section text (up to '### Mermaid graph')."""
    idx = structure_text.find("### Content block")
    if idx == -1:
        raise RuntimeError("No '### Content block' section found")
    rest = structure_text[idx + len("### Content block"):]
    end = rest.find("### Mermaid graph")
    if end == -1:
        end = len(rest)
    return rest[:end].strip()

ROLE_SOUL = {
    "toby": "toby",
    "ilsa": "ilsa",
    "mara": "mara",
}

SPELL_ROLE_SOUL = {
    "ignite": "ilsa", "temper": "ilsa",
    "portion": "toby", "weigh": "toby",
    "steep": "mara", "preserve": "mara",
    # Postman / Priest / Farmer have no deep-soul holder this life -> walk-on
    "scratch": None, "seal": None, "dry": None,
    "leap": None, "waft": None,
    "breath": None, "furrow": None,
}

def scene_soul(scene_id):
    if scene_id.startswith("ENC-") or scene_id.startswith("NGT-"):
        soul_slug = scene_id.split("-")[1]
        return ROLE_SOUL.get(soul_slug)
    if scene_id.startswith("SPB-"):
        spell = scene_id.split("-", 1)[1]
        return SPELL_ROLE_SOUL.get(spell)
    return None

def list_scenes(prefixes):
    out = []
    for fname in sorted(os.listdir(STRUCTURE_DIR)):
        if not fname.endswith(".md"):
            continue
        scene_id = fname[:-3]
        if any(scene_id.startswith(p) for p in prefixes):
            out.append(scene_id)
    return out

# ---------------------------------------------------------------------------
# Slot definitions — generic 4-slot shape per scene (setup, option a/b/c)
# ---------------------------------------------------------------------------

SLOT_ASKS = {
    "setup": (
        "Write the scene's OPENING beat(s) — the incoming-state description "
        "and any narration/dialogue beat(s) BEFORE the choice node (labelled "
        "O-... and A-... in the structure). One combined third-person action "
        "beat, plus any spoken line the structure indicates, in the soul's "
        "voice."
    ),
    "option_a": (
        "Write option a's beat: the response the soul (or scene) gives to "
        "option a's pick, as described in the CH node. If option a is a "
        "player_line (spoken player option), ALSO write that player line "
        "(12-word ceiling) followed by the response. If option a is a "
        "surface_action (no player_line), write only the response."
    ),
    "option_b": (
        "Write option b's beat: the response the soul (or scene) gives to "
        "option b's pick, as described in the CH node. If option b is a "
        "player_line (spoken player option), ALSO write that player line "
        "(12-word ceiling) followed by the response. If option b is a "
        "surface_action (no player_line), write only the response."
    ),
    "option_c": (
        "Write option c's beat: the response the soul (or scene) gives to "
        "option c's pick, as described in the CH node. If option c is a "
        "player_line (spoken player option), ALSO write that player line "
        "(12-word ceiling) followed by the response. If option c is a "
        "surface_action (no player_line), write only the response."
    ),
}

def run_scene_slots(scene_id, model_label, log_fh, max_tokens=150):
    path = os.path.join(STRUCTURE_DIR, f"{scene_id}.md")
    text = read_file(path)
    content_block = extract_content_block(text)
    soul = scene_soul(scene_id)
    banned_names = tuple(n for n in ALL_CAST_NAMES if n not in content_block)
    out_path = os.path.join(RAW_DIR, model_label, f"{scene_id}.json")
    existing = {}
    if os.path.exists(out_path):
        existing = json.load(open(out_path, "r", encoding="utf-8"))
    for slot_label, ask in SLOT_ASKS.items():
        if slot_label in existing:
            continue  # resumable
        # option_c may not exist as a spoken slot for every scene, but all
        # 25 structures were authored with exactly 3 lettered options, so
        # option_a/b/c always apply.
        system = build_system(soul, is_player_line=False)
        user = build_user(slot_label, content_block, ask)
        unit_id = f"{scene_id}::{slot_label}::{model_label}"
        result_text, wc, ok, err = generate_with_retry(unit_id, system, user, max_tokens, log_fh, banned_names=banned_names)
        existing[slot_label] = {"text": result_text, "wc": wc, "ok": ok, "err": err}
        safe_write(out_path, json.dumps(existing, indent=2))
    return existing

# ---------------------------------------------------------------------------
# INT-1 — intro scene, unchanged shape, 2 bounded calls, regenerated under
# the new model assignment (Muse-12B / Violet-Lotus, 2 variants)
# ---------------------------------------------------------------------------

def run_intro(model_label, log_fh):
    out_path = os.path.join(RAW_DIR, model_label, "INT-1.json")
    if os.path.exists(out_path):
        return
    intro_system = (
        f"{SLOT_INSTRUCTION}\n\nThe player has no card — write in the plain "
        "world dialect: one thought per turn, exact about what-is, vague "
        "about what-it-means, curiosity as the signature.\n\n"
        f"{BANNED_VOCAB_GUARD}"
    )
    beat_a = build_user(
        "INT-1-a",
        "Opening beat. A traveling mage arrives in the village during "
        "festival week.",
        "Cover: why the mage has come (drawn by the Festival of Souls and "
        "Hearthlight, collecting magic from around the world), and the "
        "stakes of the festival this year (the village needs the Lantern "
        "Arch lit and the souls called home). Third-person narrator beat "
        "plus one or two short spoken/thought lines.",
    )
    beat_b = build_user(
        "INT-1-b",
        "Second beat, immediately after arrival.",
        "A villager greets the mage and asks their name — the player's "
        "name-entry moment, framed as a story beat, not a menu. Third-"
        "person narrator beat plus the villager's short spoken greeting "
        "and question.",
    )
    text_a, wc_a, ok_a, err_a = generate_with_retry(f"INT-1-a::{model_label}", intro_system, beat_a, 150, log_fh)
    text_b, wc_b, ok_b, err_b = generate_with_retry(f"INT-1-b::{model_label}", intro_system, beat_b, 150, log_fh)
    result = {
        "beat_a": {"text": text_a, "wc": wc_a, "ok": ok_a, "err": err_a},
        "beat_b": {"text": text_b, "wc": wc_b, "ok": ok_b, "err": err_b},
    }
    safe_write(out_path, json.dumps(result, indent=2))

# ---------------------------------------------------------------------------
# Greetings — the 5 new GRT-*-generic texture rows (1 variant, gemma26b only)
# ---------------------------------------------------------------------------

TEXTURE_SOULS = ["linnet", "nell", "juno", "pip", "bex"]

def run_greetings(model_label, log_fh):
    out_dir = os.path.join(RUN_DIR, "dialogue", "greetings")
    os.makedirs(out_dir, exist_ok=True)
    for soul in TEXTURE_SOULS:
        unit_id = f"GRT-{soul}-generic"
        card_path = os.path.join(CAST_DIR, f"{soul}.md")
        if not os.path.exists(card_path):
            log_fh.write(f"- **{unit_id}** SKIPPED - no cast card at {card_path} (texture soul may be "
                          f"documented elsewhere; not in cast/*.md this run can read live).\n")
            continue
        essence, voice = load_cast(soul)
        system = (
            f"{SLOT_INSTRUCTION}\n\nThis soul's essence:\n{essence}\n\nThis soul's voice:\n{voice}\n\n"
            f"{ANTI_COPY_GUARD}\n\n{ANTI_INVENTION_GUARD}\n\n{BANNED_VOCAB_GUARD}"
        )
        user = build_user(
            "greeting-generic",
            f"{soul.capitalize()} going about their ordinary business, festival week. "
            "The player has already met them before (not a stranger, not yet close) — "
            "this is the generic, already-met greeting, distinct from a first-meeting line.",
            "Write the generic already-met greeting line: one short action beat plus the "
            "spoken greeting.",
        )
        text, wc, ok, err = generate_with_retry(unit_id, system, user, 150, log_fh)
        lines = [f"# GRT-{soul}-generic", "", f"**Soul:** {soul.capitalize()}", "",
                 "**Level:** generic (already met)", ""]
        if ok:
            lines += ["**Generated output:**", "", text, "", f"**Word count:** {wc}"]
        else:
            lines += ["**GENERATION FAILED / SKIPPED**", "", f"Error: {err}"]
        safe_write(os.path.join(out_dir, f"GRT-{soul}-generic.md"), "\n".join(lines) + "\n")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_lines.py <model_label> <night|conv|greetings>")
        sys.exit(1)
    model_label = sys.argv[1]
    group = sys.argv[2]

    with open(RUN_LOG, "a", encoding="utf-8") as log_fh:
        log_fh.write(f"\n\n## Phase 2 run: model={model_label} group={group} started {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        if group == "night":
            run_intro(model_label, log_fh)
            scenes = list_scenes(["NGT-"])
        elif group == "conv":
            scenes = list_scenes(["ENC-", "SPB-"])
        elif group == "greetings":
            run_greetings(model_label, log_fh)
            log_fh.write(f"\n## Phase 2 run finished {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            return
        else:
            print(f"Unknown group: {group}")
            sys.exit(1)

        for scene_id in scenes:
            run_scene_slots(scene_id, model_label, log_fh)

        log_fh.write(f"\n## Phase 2 run finished {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    print(f"Done: model={model_label} group={group}, {len(scenes)} scenes processed.")


if __name__ == "__main__":
    main()
