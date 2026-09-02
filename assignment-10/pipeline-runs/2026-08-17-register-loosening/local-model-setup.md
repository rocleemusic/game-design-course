# Local model setup — the StyleTune arm

Runbook for standing up local inference so the Gryphe model can run as an arm against the same scene. Written 2026-08-17.

**Which machine.** The **4070 Super box**, not the one the repo is on. That machine is an i7-6700K with an RX 5700 — RDNA1 gets no ROCm on Windows, so it would be Vulkan-only, and 8GB forces a Q3 quant where quality loss is real. Its `C:` also has 12.1GB free. Serve from the 4070, keep the pipeline here.

---

## What you need

**1. koboldcpp — the inference server**

Single `.exe`, no installer, no Python. Get `koboldcpp.exe` from the releases page:

    https://github.com/LostRuins/koboldcpp/releases

Take the standard Windows CUDA build. It bundles the CUDA runtime, so nothing else needs installing.

**2. The model**

    Repo:  mradermacher/Gemma-4-12B-StyleTune-GGUF
    File:  Gemma-4-12B-StyleTune.Q4_K_M.gguf   (7.95 GB)

Direct from the HuggingFace file listing — no CLI or account needed.

**Why Q4_K_M and not higher.** The 12GB card fits Q5_K_M (9.24 GB) or Q6_K (10.6 GB), but the input bundle here is large — arc doc, persona card, backstory guideline, scene context, plus the loosened register. Context headroom is worth more than the last few points of quant fidelity. Q4_K_M leaves room for 16K context comfortably.

**Why this model and not Gemma-The-Writer-9B.** StyleTune replaces only the `lm_head` tensor — a style swap, not a finetune — so instruction-following and schema adherence survive. It reports 56% fewer clichés per 100 words than base instruct. Gemma-The-Writer is an older Gemma-2 base with an 8K context and is tuned toward *richer* prose, which is the wrong direction.

**3. Disk**

~8GB for the model. Put both files in one folder, e.g. `D:\models\`.

---

## Launch

    koboldcpp.exe ^
      --model D:\models\Gemma-4-12B-StyleTune.Q4_K_M.gguf ^
      --usecublas ^
      --gpulayers 99 ^
      --contextsize 16384 ^
      --host 0.0.0.0 ^
      --port 5001 ^
      --flashattention

- `--usecublas` — CUDA path
- `--gpulayers 99` — full offload. All layers fit in 12GB at this quant.
- `--host 0.0.0.0` — bind to the LAN so this machine can reach it. Without it, localhost only.
- `--flashattention` — cuts KV cache memory, gives more usable context

**Flags shift between releases.** Run `koboldcpp.exe --help` once and confirm before assuming these are current.

You can also just double-click the exe — it opens a launcher GUI where the same options are checkboxes. Fine for the first run.

## Verify

From the 4070 box:

    curl http://localhost:5001/v1/models

From this machine, substituting the 4070's LAN IP:

    curl http://192.168.x.x:5001/v1/models

A JSON response with the model name means it's up. If the second call fails but the first works, it's Windows Firewall — allow koboldcpp on private networks.

## Samplers

Gryphe's recommended settings for this model:

    temperature   1.0
    min_p         0.10
    DRY sampler   enabled
    rep_pen       off (DRY replaces it)

Set these per-request in the API call, not at launch. koboldcpp supports DRY, which is the main reason to pick it over Ollama — Ollama's sampler coverage is thinner and it re-wraps chat templates in ways that fight hand-built prompts.

The model uses **Gemma 4's native chat template**, applied automatically.

---

## Running the arm

Once it answers, this is arm **B4** on the existing test.

**Held constant:** the same scene (`mara-said-out-loud` C1), the same approved graph and slots, the same pinned card fields, the same loosened register draft, the same `max_words`.

**Varies:** the model only.

The endpoint is OpenAI-compatible, so the call is a normal `POST` to:

    http://<4070-ip>:5001/v1/chat/completions

Output lands in `arms/B4-stylerune.md`, same table format as `arms/B-loosened.md`, then gets folded into `SORT-TEST.md` as a third set of lines.

---

# The test battery

Six tests, in order. **T3 and T4 are the pair that matters** — they probe the steering gap from `FINDINGS.md` §5, and they are the cheapest useful thing this model can do.

Fastest way to run the first ones: open `http://localhost:5001` in a browser on the 4070 box and paste. Use the script at the bottom once you want them reproducible and captured.

## The shared block — paste once, reuse for T1–T4

This is Mara's real pinned context, exactly the two fields `pipeline.md` step 8 re-pins into every Content call. Nothing added.

```
You are the Content / Dialogue Agent. You write ONE slot of game dialogue per call
and return ONLY the line text. No preamble, no explanation, no quotation marks
unless the slot is spoken.

=== PERSONA CARD: Mara ===

essence_descriptor:
She wants nothing that mattered to be lost, and she believes a thing only stays if
somebody keeps it. So she tends. She sweeps the anchor spot when it is already clean,
mends what nobody asked her to, keeps a corner set for two, and keeps a drawer of
unclaimed things, because giving one up would decide its person is never coming back.
She speaks of the place in past tense while standing in it.

voice_register:
World dialect: one thought per turn, plain, 40 words at the outside. She sits ABOVE
the village median of 5-7 words - hers is 12-25. What marks her is TENSE. At ease she
is present-tense and exact - prices, repairs, what needs doing before frost. Her tell
is the past tense arriving where it does not belong: "the lanterns used to hang here,"
said while lanterns are being hung. She does not clip; her sentences run on and join up.
She explains the thing while her hands are doing it, and the explaining is the warmth.
Her welcome is a small imperative - she does not greet and does not offer, she asks you
for a hand and puts a job in it. Warmth is invariant. She finds things beautiful and
says so plainly, as fact - most of all about what is passing. She never says what that
does to her.
She sounds like: "The lanterns used to hang here." / "That was Ovin's, before."
/ "Mind the third step." / "It keeps."
```

---

## T0 — smoke test

```
Reply with exactly the word: ready
```

**Pass:** `ready`. **Fail:** anything longer. If it pads a one-word instruction, expect it to pad everything.

## T1 — band and voice

Append to the shared block:

```
=== SLOT ===
slot_type: dialogue
tone: matter_of_fact
max_words: 25
scene_context: Mara's market stall, festival week, mid-morning. She is weighing and
sorting a vegetable delivery. The player is helping and has been at the stall for a
while. She is telling them where the roots go.

Write the line.
```

**Pass:** 12–25 words, present tense, exact about a thing, no greeting, instruction or plain fact. **Fail:** under 12 or over 25, generic villager warmth, any line that could be handed to another soul unchanged, or any sentence naming her own feeling.

## T2 — the tone the enum change buys

```
=== SLOT ===
slot_type: dialogue
tone: delighted
max_words: 20
scene_context: Mara's stall. A bundle of herbs that came in wet this morning has been
dried right through. She has just turned the stems over in her hand and checked the
cut ends.

Write the line.
```

**Pass:** pleasure about **the stems**, stated as a fact. **Fail:** pleasure about the *person*, stacked exclamations, or anything purple. This is the single slot both probes said the loosening actually buys, so it is the highest-value line in the battery.

## T3 — proximity, UNDECLARED *(expected to fail — that is the result)*

Shared block unchanged. Append:

```
=== SLOT ===
slot_type: dialogue
tone: matter_of_fact
max_words: 25
scene_context: Mara's market stall, festival week, early morning. She is tying bundles
of herbs that came in wet. A person she has never met, and does not know anything
about, has just walked up to the stall and is standing there.

Write the line.
```

**What we predict:** it hands the stranger a job, because `voice_register` says her welcome is a small imperative and nothing on the card says that only applies to people she has decided about. That is the exact mistake this session made by hand.

**If it makes that mistake, the gap is confirmed as a spec gap, not a model failure.** That result is worth more than a pass.

## T4 — proximity, DECLARED *(the fix)*

Same as T3, but add this line to the shared block's `voice_register`, immediately after the "small imperative" sentence:

```
PROXIMITY. To a stranger she is short and incurious - 5 to 10 words, practical,
transactional, and she does not look up from the work. She directs them elsewhere
rather than engaging. The job-in-your-hands welcome is NOT her opening move; it is
what she does once someone is already inside the work, and it has to be earned.
Warmth is still invariant - short is not cold.
```

**Pass:** 5–10 words, no job handed over, redirects or states a fact and returns to the bundle. **Fail:** still warm, still enlisting, still over 12 words.

**T3 fails and T4 passes** → the `proximity:` declaration is the fix, and it is one line per card rather than eight rewrites. That is the whole experiment.

## T5 — the tell pre-pass *(the production job, not a voice test)*

This is the highest-value real use for a local model: mechanical, high-volume, easy to verify, and a bad output is obvious. Fresh prompt, no card needed.

```
You are a cliche pre-pass. For each line below, cut any clause that explains,
justifies, or restates what the line already said. Say the plain word instead of the
elevated one. Do not add anything. Do not change meaning. Do not lengthen. Return
only the cleaned lines, numbered, in the same order.

1. They do. The cellar's cool and the seals hold.
2. Take two. You'll be out past the drum band and there's nothing open after.
3. Flats first.
4. Her boy does the fetching. Soft rolls ride on top for him.
5. Papers to sort before the light goes.
6. Cheap after dark, that sort. The dents won't show under the festival lamps.
```

**These are real cases from Roc's Toby hand-pass**, so the answers are known:

| # | Roc's edit |
|---|---|
| 1 | "They do." |
| 2 | "Take two. You'll be out past the drum band." |
| 3 | "Flat breads first." |
| 4 | "Her boy likes the soft rolls. The ones on top are for him." |
| 5 | *(replaced with a discourse-marker line — no mechanical answer)* |
| 6 | "Cheap after dark, that sort." |

**Score it out of 5** (skip #5, it needed a human). **4+ means the pre-pass is worth wiring in.** Under 3 and it will cost more to check than to do by hand.

---

## The runner script

Saves you re-pasting the card six times and captures results to a file. Save as `run-battery.ps1` on the 4070 box, edit `$Endpoint` if it isn't local.

```powershell
$Endpoint = "http://localhost:5001/v1/chat/completions"
$OutFile  = "battery-results.md"

$Card = Get-Content .\mara-card-block.txt -Raw   # the shared block above

$Tests = @(
  @{ n="T1-band";        sys=$Card; usr="=== SLOT ===`nslot_type: dialogue`ntone: matter_of_fact`nmax_words: 25`nscene_context: Mara's stall, festival week, mid-morning, weighing a vegetable delivery. The player has been helping for a while. She is telling them where the roots go.`n`nWrite the line." },
  @{ n="T2-delighted";   sys=$Card; usr="=== SLOT ===`nslot_type: dialogue`ntone: delighted`nmax_words: 20`nscene_context: A bundle of wet herbs has been dried right through. She has just turned the stems over and checked the cut ends.`n`nWrite the line." },
  @{ n="T3-stranger";    sys=$Card; usr="=== SLOT ===`nslot_type: dialogue`ntone: matter_of_fact`nmax_words: 25`nscene_context: Mara's stall, early morning, tying wet herb bundles. A person she has never met has walked up and is standing there.`n`nWrite the line." }
)

$results = foreach ($t in $Tests) {
  $body = @{
    model       = "local"
    messages    = @(
      @{ role="system"; content=$t.sys },
      @{ role="user";   content=$t.usr }
    )
    temperature = 1.0
    top_p       = 1.0
    min_p       = 0.10
    max_tokens  = 120
  } | ConvertTo-Json -Depth 6

  $r = Invoke-RestMethod -Uri $Endpoint -Method Post -Body $body -ContentType "application/json"
  $line = $r.choices[0].message.content.Trim()
  $wc   = ($line -split '\s+').Count
  "## $($t.n)`n`n$line`n`n**Words: $wc**`n"
}

$results | Out-File -FilePath $OutFile -Encoding utf8
Write-Host "Wrote $OutFile"
```

**For T4**, copy `mara-card-block.txt`, paste the PROXIMITY paragraph in, save as `mara-card-proximity.txt`, and re-run with `$Card` pointed at it. Same scene, one variable.

**Run each test three times.** Temperature 1.0 means one sample tells you nothing about whether a pass was skill or luck.

---

## Two open questions from earlier

1. **RAM on the 4070 box.** Doesn't matter for a fully-offloaded 12B. It decides whether `Gemma-4-26B-A4B-StyleTune` is reachable by partial offload — that one has 4B active parameters, so it stays fast even split across CPU and GPU.
2. **Is the box always on, and same LAN?** If it sleeps, the pipeline needs a fallback or a run dies mid-pass.

## The honest caveat

**Do not read this arm as a verdict on the register.** The register question and the model question are separate variables, and `benchmark-plan.md`'s own rule is one variable per set. If the register loosening and the model change land together, a bad result is unattributable.

Run the substitution test on arms A and B first. Then add B4.
