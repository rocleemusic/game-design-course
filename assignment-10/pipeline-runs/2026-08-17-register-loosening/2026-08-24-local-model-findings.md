# Local model findings — B4 arm result, ICM register retest, format comparison

Written 2026-08-24. Follow-up to `local-model-setup.md`. Server: koboldcpp,
Gemma-4-12B-StyleTune.Q4_K_M, on the 4070 box, reached at `localhost:5001`.

---

## 1. B4 arm result — the original test battery

Ran against the persona card in `local-model-setup.md`'s shared block (Mara,
12-25 word band, T0-T5). First pass went through KoboldAI Lite's chat box —
results were flat generic-vendor prose with no card-specific voice. Retest
went through the API directly (`/v1/chat/completions`, system+user split,
Gryphe's samplers: temp 1.0, min_p 0.10) to rule out Lite's own prompt
template as a confound. Numbers below are from the API retest, 3 samples
per test.

| Test | Result |
|---|---|
| T0 smoke | pass |
| T1 band/voice | borderline — in-band word counts, no purple language, but still explains itself ("because," "where...before") instead of stating flat fact. Doesn't hit the tense-tell. |
| T2 delighted tone | mixed — 1 of 3 runs a clean pass (plain fact, named the scene's actual detail), 2 of 3 reached for "lovely"/"beautifully" |
| T3 proximity, undeclared | failed exactly as predicted — every run hands the stranger a job immediately. Confirms this is a spec gap, not a model quirk. |
| T4 proximity, declared | **pass, 2 of 3 clean.** One line added to the card (PROXIMITY) reliably changed behavior across samples — redirects, no job handed over, right-sized. Cleanest result in the battery. |
| T5 cliche pre-pass | fail — score ~1.5/5 against Roc's hand-pass. Two runs cut the wrong clause (kept the explaining sentence, removed the plain one). Below the doc's own "under 3, costs more to check than to do by hand" bar. |

**Verdict on this card:** the KoboldAI Lite chat box is a real confound — always test via the raw API. Even correcting for that, this model does not reliably reproduce Mara's specific voice tell (tense-slip, flat economy) against the tight 12-25 word register. The proximity-declaration fix (T3->T4) is the one strong, reproducible result: worth porting to canon regardless of which model ends up running dialogue.

---

## 2. ICM register retest — same model, different card

Roc is mid-retune on `assignments/assignment-8-icm/characters/mara/brief.md`
(warmer, wordier register — 20-50 word median, 75-word ceiling, provenance
runs long, deflection reserved only for personal questions). Reran the same
two scene contexts (band, delighted) against this card instead, API path,
3 samples each.

**Result: clearly better fit than the old card.**

- Word counts landed inside the wider band every time (27-40 words)
- Concrete, exact detail showed up unprompted — "root-down," "winter sage,"
  "eastern crate," "stem-ends are crisp" — this is the precision trait
  landing, not generic filler
- Pleasure-about-the-object (the delighted-tone test) came through with real
  physical claims tied to detail, not stacked adjectives
- The model landed a consistent voice tic on its own across all 3 runs —
  opening delighted lines with "There now," stranger lines with "Good
  morning" — nobody told it to do that

**Caveat:** this card has no PROXIMITY clause, so the model handing the
stranger a job right away is *correct* behavior here, not a repeat of the
T3 failure — the trait axis says the imperative-welcome applies without a
stranger exception. Worth deciding whether that's intentional as part of
the retune, since it's a real behavior difference from the old card.

**Open question, not answered here:** whether the wordier register is also
better on the primary/production model, not just this local one. This
session only tested one model against two cards — a separate pass is needed
before concluding the register change itself is the win, versus this model
specifically preferring more room to work with.

---

## 3. Format comparison — structured call vs. Kobold Scenario format

While inspecting KoboldAI Lite's "load a Character Card" flow, found two
distinct, unrelated formats in play:

1. **Tavern Character Card V2** (`chara_card_v2`) — real JSON spec,
   importable via Lite's character-card loader (PNG or JSON). Fields:
   `name`, `description`, `personality`, `scenario`, `first_mes`,
   `mes_example`, plus V2 additions (`system_prompt`,
   `alternate_greetings`, `character_book` as an optional keyword-triggered
   lorebook). Spec: github.com/malfoyslastname/character-card-spec-v2.
   Not what Roc's screenshots showed.
2. **Kobold's native Scenario format** — plain text, not JSON. Bracketed
   attribute list (`[Character: Name; species: ...; personality: ...]`)
   plus `{{[INPUT]}}` / `{{[OUTPUT]}}` turn markers and a `{{user}}`
   placeholder token. This is what Roc actually pulled from the UI
   (Emily/Haruka/InteracTV examples). The separate Context Data modal
   (Memory / World Info / TextDB) is a third, independent system — Memory
   is the always-loaded block, World Info is keyword-triggered (closest
   analog to `character_book`), TextDB is RAG-style retrieval over a
   pasted document.

**Ran the ICM card through both formats, same scene, 3 samples each:**

- **Structured system+user call** (system = full card, user = slot
  instructions, explicit "return ONLY the line text, no narrator voice")
  → stayed in character, spoken-line-only, matched the turn contract in
  `characters/mara/CONTEXT.md`.
- **Kobold Scenario format** (bracket attributes + `[Start Roleplay Scene]`)
  → all 3 runs added third-person narrator prose around the dialogue
  ("Mara pauses, running a dirt-stained thumb over a gnarled carrot...").
  Not spoken-line-only.

Samples, same question ("Where do the roots go?"), same card content:

> **Structured:** "These earth-stars need to go into the eastern crate.
> They'll stay cool there until the evening rush when the tarnish wears off
> and the tonic needs brewing." (27 words)
>
> **Scenario:** "The carrots and parsnips need sorting before the evening
> rush," Mara says, nudging a wooden crate toward you. "These are
> lovely—earthy and robust." She tucks a stray hair behind her ear,
> watching your hands work. (35 words)

**Not a verdict, an open question.** The narrator-prose version isn't a
worse output — Roc likes the texture it adds (action beats, physical
detail) and flagged it as useful for a VN-style presentation. It only
"fails" against the *current* rule in `characters/mara/CONTEXT.md` step 2:
"Output is her spoken line only... no narrator voice." So the real decision
isn't format A vs format B, it's whether that no-narrator-voice rule should
hold for this project or get loosened as part of the same retune brief.md
is already going through.

If the rule stays as-is: structured system+user call is the match, since it
reliably respects it and the Scenario format doesn't.
If narrator texture is wanted: the Scenario format's `[Start Roleplay
Scene]` framing produces it more reliably than a bare instruction to "add
narration" would, since it's already steering the model toward that shape
— worth testing a hybrid (structured call + an explicit "include a short
narrator beat" instruction) before adopting the Scenario format wholesale,
since that format also drops the contract's ledger-update step entirely.

---

## 4. Hybrid format — narrator beat + spoken line, inside the structured call

Tested whether the Scenario format's narrator texture could be had without
giving up the structured call's contract compliance. Kept the system+user
split; swapped only the output-format instruction from "return ONLY the
line text, no narrator voice" to "one short third-person narrator beat,
then her spoken line in quotes." Same ICM card otherwise. 3 samples each,
band and delighted scenes.

**Result: works, and better than the raw Scenario format.** Every run
returned a clean two-part output — one narrator-beat sentence, then the
spoken line in quotes — not blended into one paragraph the way the
Scenario format did. That separation means the ledger-update step (or any
downstream code) can still isolate the spoken line if it only needs that,
while the beat rides along as a distinct piece. The beats also landed
consistently on something exact and physical — stone scale, brass scale,
thumb on a stem, checking crispness — matching the Precision trait axis
more directly than the Scenario format's beats did.

Samples (HYB1-band):

> *Mara slides the basket of freshly dug roots across the counter toward
> the player.* "These go into the third crate beneath the floorboards—they
> need to stay cool and dark, exactly where the earth left them, until the
> brewing begins tomorrow." (40 words)
>
> *She weighs a bundle of winter radishes on the brass scale while sliding
> the container toward the player.* "These go in the lower tilled crate,
> where the earth stays thickest; the roots need to remember the darkness
> of the soil before we add them to the tonic." (47 words)

**Note — word budget.** All six hybrid runs landed 38-52 words, over the
ICM card's 20-50 median once the beat is counted as part of the turn. Roc's
read: these read well enough as-is that the budget should extend to cover
it, rather than trimming the beat down to fit the existing band. Treat the
beat as additive to `brief.md`'s word-count rule going forward, not
counted against it as if it were dialogue.

---

## Bottom line

- **Model:** not yet good enough on voice-texture (T1/T2, ICM1/ICM2 all
  land borderline-to-mixed), but reliably good at structural fixes when a
  rule is stated plainly (T4's proximity fix). Best fit so far: mechanical,
  checkable jobs, not free voice generation.
- **Register:** the ICM retune reads better through this model than the old
  card, in both output quality and word-count reliability — but that's one
  model, one variable, not proof the retune itself is the win.
- **Prompt format:** always call the API directly with a system+user split,
  never through Lite's chat box (wraps its own template). Between the three
  variants tested — structured/no-narration, raw Scenario format, and the
  hybrid — the **hybrid is the pick**: it keeps the structured call's
  contract compliance (parseable, ledger step unaffected) while getting the
  narrator texture Roc wants for a VN presentation. Requires extending
  `brief.md`'s word budget to cover the beat, per the note in section 4.

## 5. Model comparison — StyleTune vs. 3 alternative fiction-writing models

Sourced 5 candidate fiction/roleplay models to compare against StyleTune
(all Q4_K_M or closest equivalent, all fit the 4070's 12GB). Muse-12B's
download came through corrupted (truncated at 6.15GB of 7.48GB expected —
needs a clean re-download before it can be tested) and MN-Violet-Lotus-12B
finished cleanly, so 3 of 5 got a full run against the ICM card: 3 samples
each on ICM1 (band), ICM2 (delighted), ICM3 (stranger), plus 3 new scenes
(provenance, a returning regular customer, and the preserve spell) chosen
specifically because they aren't covered by the card's own sample lines —
built to catch a model just echoing the example text back instead of
generating new content.

| | StyleTune (12B) | Mighty-Sword-9B | Violet-Lotus-12B | L3.2-Rogue-7B (abliterated) | Fimbulvetr-11B |
|---|---|---|---|---|---|
| **Band/delighted voice** | borderline-mixed (section 2) | **best of all 5** — natural cadence, concrete detail, no purple language | strong prose, fluid | thin, vague, missing capitalization | strong, sensory, concrete |
| **Verbatim sample-copying** | not tested this way | **yes — all 3 stranger runs identical to card's sample line** | yes — 2 of 3 welcome-scene runs | no whole-line copies, but reused the sample's proper noun ("Ovin's") | yes — core clause ("cold, dark, and somebody remembering it's there") in 2 of 3 runs |
| **States her own feelings directly (Hard limit 1 risk)** | not observed | not observed | **yes** — "the past is always with us, in the things we keep" | not observed | not observed |
| **Invents non-canon backstory/lore** | not observed | not observed | yes — invented "the child she's waiting for" | **yes, most severe** — full invented backstory (customer, great-grandfather's workshop, a promise to a child) | not observed |
| **Invents non-canon spell components** | not tested | not tested | not tested | not tested | **yes, every run** — root, ash, moonlight, "your own heart" instead of salt-only per `brief.md`'s Magic table |
| **Coherence** | consistent | consistent | consistent | one run degraded into repetitive near-nonsense | consistent, but one run ran to 133 words on a spell explanation |
| **Overall read** | generic-vendor default, needs the API path to behave (section 1-2) | best voice quality, but the copy-tic makes it unsafe on welcome/job-handoff beats specifically | best prose, but two separate hard-limit-adjacent risks (self-explaining, invented lore) | weakest — formatting bugs, heaviest hallucination, one incoherent run | good voice, but breaks actual game mechanics (spell components), which is a harder failure than a voice miss |

**Reading across all 5:** every single model that got the full battery
showed *some* form of copying the card's own example content back nearly
verbatim, on welcome/job-handoff-shaped scenes specifically. That's not
one model's quirk — it's a shared failure mode tied to how concrete and
quotable that one sample line is. Worth revisiting: either replace it with
a less literally-liftable example, or add an explicit "do not repeat the
sample lines verbatim" instruction, before trusting *any* of these models
on that beat.

Past the shared copy-tic, each model's other failure is different in kind:
Mighty-Sword-9B's is a safe failure (repeats a good line). Violet-Lotus and
Rogue drift into hard-limit territory (stating feelings, inventing lore).
Fimbulvetr's is the most concrete danger for gameplay, since inventing
spell components breaks the "wrong component, no effect" rule directly,
not just voice.

**No clear winner yet.** Mighty-Sword-9B has the best raw prose quality of
the batch but the most consistent copy problem. None of the 5 is ready to
trust unsupervised against the hard limits as currently written — every one
needs either a prompt fix (the sample-line issue) or more targeted testing
before it's near production.

**Not yet run:** Muse-12B (corrupted download, needs redo — this was the
top pick going in, specifically for its anti-cliché training, so worth
prioritizing once redownloaded) and the T3/T4 proximity-declaration retest
from section 1 hasn't been rerun against any of these 3 new models.

---

## 6. Fixing the copy-tic — card edit and retest

Section 5's cross-model finding was that the welcome/job-handoff scene
shape pulled every tested model toward reproducing the card's own example
text. Fixed `mara-card-icm.txt` two ways: (1) added an explicit instruction
to the system-prompt wrapper - "these exist to show you the shape... never
output an example line verbatim or near-verbatim" - and (2) reworded the
one inline welcome example from a literal quoted line into a description
of the shape (notice, name a task tied to the scene, fold in a question),
removing the single most-copied string entirely. Retested the two
welcome-shaped scenes (ICM3, EX2-welcome-again) against all 4 working
models, 3 samples each.

**Result: the fix works, but not uniformly, and it exposed a new problem
each model has when the crutch is removed.**

| | Mighty-Sword-9B | Violet-Lotus-12B | L3.2-Rogue-7B | Fimbulvetr-11B |
|---|---|---|---|---|
| Copying eliminated? | **Yes - clean across all 6** | **Yes - clean across all 6** | Yes, no copying | Partial - still leaked from the *other* sample lines in the footer, which weren't edited |
| What happened instead | Quality held, even improved - real specific callbacks appeared ("how's Elara's knee been behaving?") | Two of six runs drifted into full narrator prose (up to 105 words), breaking the "no narrator voice" rule in the wrapper itself | **Lost the behavior entirely** - all 6 lines dropped under the 20-50 word band (5-19 words), generic greetings, no task handed over, no personal question | Verbatim reuse of "Mind the third step... You'll stop noticing it by the second" and "Cold, dark, and somebody remembering it's there" - both from the untouched footer list. One run also mixed first- and third-person mid-line. |

**Reading:** the instruction-plus-reword fix is real, but each model failed
differently once the concrete crutch was gone. Mighty-Sword-9B is the clear
winner here - it didn't need the literal example to perform the behavior,
it generalized from the *description* of the shape. Violet-Lotus mostly
held but occasionally ignores the output-format rule regardless of what's
in the persona section. Rogue needed the concrete example just to execute
the trait at all - remove it and the model reverts to safe, bland,
under-length filler. Fimbulvetr's leak confirms the fix needs to cover
*every* quotable line in the card, not just the one edited - the footer's
"Sample lines" block still needs the same treatment before this model can
be trusted on any beat close to one of those four examples.

**Practical takeaway:** if `brief.md`'s canon version adopts an anti-copy
instruction, it should (a) apply to every example line in the card, not
just one, and (b) get paired with an explicit reminder of the output-format
rule near wherever the instruction sits, since Violet-Lotus dropped that
rule under the same conditions that fixed its copying. And it's now clear
model choice interacts with prompt fixes, not just voice quality - Rogue's
regression here reinforces that it's the weakest of the batch, and
Mighty-Sword-9B's resilience here strengthens its position as the current
front-runner pending Muse-12B's retest.

---

## 7. Muse-12B — best prose, worst format discipline

Redownloaded cleanly (first attempt was truncated at 6.15 of 7.48GB - see
section 5). This was the top pick going in, on the strength of its
community reputation for anti-cliche training (confirmed independently via
a pasted SillyTavernAI megathread: one poster's favorite RP model,
Tlacuilo-12b, is itself a finetune of Muse-12B, credited with "lacks
cliches, writes really well"). Ran the full battery: ICM1-3, EX1-3, the
post-fix welcome retest, and the hybrid-format test.

**Result: best raw prose of all 6 models tested, but it ignores the
"no narrator voice" output-format instruction on every single run.**

- **ICM1-3 (9 runs):** 41-149 words against a 20-50 word median - every
  run wraps the spoken line in full third-person narration ("She wipes her
  hands on her apron, leaving streaks of green on the cloth," "The sound of
  the drying herbs is like whispering parchment"). No copying, no purple
  filler - the prose itself is the most vivid and specific of the batch.
- **EX1-3 (9 runs):** same pattern, 93-152 words. Critically, **every spell
  explanation stayed salt-only** - no invented root, ash, or moonlight,
  unlike Fimbulvetr. Muse's failure mode is purely length, not a canon
  violation.
- **Welcome retest, post-fix (6 runs):** copying stayed fixed here too
  (same as the other 3 models in section 6), but the format problem got
  worse, not better - 69-163 words. One run (EX2, fix1) leaked visible
  meta-commentary into the output: *"(Note: The line is spoken naturally,
  not in quotation marks. The customer is not mentioned by name...)"* - the
  model narrating its own compliance with the instructions instead of
  following them.
- **Hybrid format test:** ran the same beat-plus-line prompt that worked
  cleanly for Mighty-Sword-9B and Violet-Lotus (38-52 words there). Muse
  ignored the bound entirely - all 6 runs read as full vignette scenes,
  98-161 words. One good sign inside that: a run spontaneously referenced
  "Ovin," a name from the card's own footer sample, as a natural callback
  rather than copying the line - real continuity, unprompted. One risk:
  that same run dwelled on the Ovin memory for several sentences, brushing
  against the card's own grief rule ("fragments divided by action slots...
  never a long run about the loss").

**Roc's read, and the practical conclusion:** this isn't a dialogue-slot
model, it's a vignette model. It doesn't fit the per-turn dialogue contract
`characters/mara/CONTEXT.md` currently defines, no matter how the
instruction is worded - three different prompt shapes (plain, post-fix,
hybrid) all failed to bound it. But the prose quality suggests a different
job: **intro screens and festival vignettes**, where unconstrained
scene-setting is the point rather than a defect. Worth prototyping there
specifically, not forcing it into the same evaluation the other 5 models
are being held to.

**Updated model ranking, all 6:**

| | Prose quality | Format discipline | Canon/hard-limit safety |
|---|---|---|---|
| StyleTune | solid, plain | good | clean |
| **Muse-12B** | **best of all 6** | **worst - ignores word budget every run, one meta-commentary leak** | clean (salt-only, no self-explaining) |
| Violet-Lotus | very good, warm | mostly good, occasional narrator drift | two risks (self-explains feelings, invents lore) |
| Mighty-Sword-9B | strong | **best - held up under the anti-copy fix without losing anything** | clean |
| Rogue / Fimbulvetr | erratic | erratic | canon violations (Fimbulvetr invents spell components) |

For actual turn-by-turn NPC dialogue, Mighty-Sword-9B remains the
front-runner. Muse-12B is now a strong second track for a different job
entirely - narrative scene-setting content, not reactive dialogue.

---

## 8. Prototyping the actual intro scene with Muse-12B

Section 7 flagged Muse-12B as a candidate for intro screens and vignettes
rather than turn dialogue. Tested that directly: built a real prompt from
`plans/2026-08-23-intro-story-ruling.md` (T16) - the three required beats
(why the mage came, festival stakes, player name entry as an in-scene
beat) - plus world context from `hearthlight-brief.md` and the hard rule
from `truth-guard.md`. Three attempts.

**Attempt 1 - single call, plain instructions.** Hit all three beats
cleanly, including a natural name-entry moment. But the mage's internal
narration edged toward stating the truth-guard's actual mechanism -
"Hearthlight is... a place where the threads of memory and belonging are
strongest. A place where the past has not let go" - a real risk, since the
rule bars every character, including the player, from that knowledge. Also
invented its own player name ("Seth") instead of leaving room for real
input.

**Attempt 2 - retest, truth-guard tightened to explicitly cover the player
character, name templated as a placeholder instead of left open, token cap
raised.** Worse, not better. The truth-guard risk did clear - no
mechanism-naming this time - but the model got slower and more ambient,
leaked a meta-preamble ("You are a narrative writer for a visual novel
game scene... Here is the scene you requested..."), and never reached the
name-entry beat at all before hitting the token cap. Packing all three
requirements into one long unconstrained generation was the actual
problem, and no amount of instruction-tightening fixed that on its own.

**Attempt 3 - split into two calls**, matching how the pipeline already
handles regular dialogue turns (short, bounded calls) rather than one long
pass. Call A: arrival, the concrete reason for coming (tied to the Lantern
Arch), festival stakes, ending right as an NPC is about to speak - 307
words, no truth-guard risk, no meta-preamble. Call B: fed Call A's own
output back in as context, continuing the same scene, and wrote the NPC's
greeting plus a natural name question - 218 words, again no truth-guard
risk, and critically, **no invented player name this time**: "You wouldn't
happen to have a name, would you?"

**Result: this is the version worth keeping.** It's the only one of the
three that's a copy-edit pass away from usable, not a rewrite. One
remaining miss: Call B was told to stop right after the name question and
print a literal `{{PLAYER_NAME_ENTRY}}` placeholder, but it kept narrating
past the question instead of stopping there. That's a formatting problem
with a code fix, not a prompt one - don't rely on the model to
self-terminate at a stop marker; detect the sentence containing the
name-question programmatically (it reliably lands near a question mark
adjacent to "name," per this prompt's phrasing) and truncate there,
inserting the placeholder in code.

**Practical takeaway for any future scene-setting content on this model:**
split by beat into separate bounded calls, the same discipline already
used for dialogue turns, rather than asking for a full multi-beat scene in
one generation. One long call reliably loses track of at least one
requirement; two short calls didn't.

Full text of all three attempts, sent to Roc directly:
`intro-scene-v1-v2.md` (attempts 1 and 2) and
`intro-scene-two-call-v1.md` (attempt 3).

## Test artifacts

Moved from scratch into version control at
`assignments/assignment-8-icm/_kobold-tests/`, sorted:

- `scripts/` — every `run_*.py` and the two `.sh` launchers
  (`download_models.sh`, `run-battery.sh`)
- `cards/` — every `mara-card-*.txt` prompt card plus
  `sample-character-card-v2.json`
- `results/original-battery/` — the section 1 B4 arm test (`battery-`,
  `t4-`, `t5-`, `scenario-`, and non-Muse `hybrid-results-run*`)
- `results/icm-register/` — section 2's ICM register test and section 5's
  cross-model comparison, all `icm-results-*` and `icm-extra-results-*`
  per model (including `-mightysword-`, `-violetlotus-`, `-rogue-`,
  `-fimbulvetr-`, `-muse-`), plus the two `all_*_results.txt` combined
  dumps used to build the artifact
- `results/welcome-retest/` — section 6's post-fix retest, all
  `welcome-retest-*-fix1/2/3.md` per model plus `all_welcome_results.txt`
- `results/hybrid-muse/` — section 7's `hybrid-results-muse-*.md`
  vignette test
- `results/intro-scene/` — section 8's `intro-scene-v1/v2.md`,
  `intro-call-a/b-v1.md`, and the two files sent to Roc directly
  (`intro-scene-v1-v2.md`, `intro-scene-two-call-v1.md`)
- `logs/` — every `kobold-*.log` server log and `download_log.txt`
- `model-comparison.html` — source file for the published "Mara Voice
  Trials" artifact (claude.ai/code/artifact/031a7631-eef8-43c8-a90e-1271c2ea7102)

Model weights themselves stay in `D:\models\` on the 4070 box, not
committed — too large, and not source material.
