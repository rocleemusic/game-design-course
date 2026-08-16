// EVALUATOR — two layers, cheap first.
//
// Layer 1 is deterministic and free: the word ceiling, taken from src/ceilings.js,
// which carries the same numbers tools/line-lint.mjs enforces on committed content.
//
// Layer 2 costs a call and is the only part that needs judgment: guardrails check 6,
// voice register. It is the check that catches "technically valid but wrong for your
// game" — a line that passes every mechanical test and is still doing another soul's
// job. It cannot be a regex, which is why it is here and not in a linter.
//
// The Verifier flags. It never rewrites. (narrative-pipeline/guardrails.md)

import { countWords, CEILING } from './ceilings.js'
import { askJson } from './llm.js'
import { MODELS, ENFORCED_CHECK } from './config.js'
import { rivalChannels } from './card.js'

export const VERDICT = {
  PASS: 'PASS',
  PROSE_FLAG: 'PROSE_FLAG', // re-wording can fix it → refine
  STRUCTURAL_FLAG: 'STRUCTURAL_FLAG', // re-wording cannot fix it → leave the loop
}

// ---------------------------------------------------------------------------
// Layer 1 — deterministic. No API call, no cost, runs first.
// ---------------------------------------------------------------------------

export function evaluateMechanical(slot, line) {
  const cap = slot.max_words ?? CEILING[slot.slot_type]
  const words = countWords(line)

  if (!(slot.slot_type in CEILING))
    return {
      verdict: VERDICT.STRUCTURAL_FLAG,
      layer: 'mechanical',
      words,
      reason: `Unknown slot_type "${slot.slot_type}". The slot spec is wrong, not the line.`,
    }

  if (words > cap)
    return {
      verdict: VERDICT.PROSE_FLAG,
      layer: 'mechanical',
      words,
      reason: `${words} words, over the ${slot.slot_type} ceiling of ${cap}. Cut it to ${cap} or fewer without losing the beat.`,
    }

  // The tell-purge, mechanically checkable half (pipeline.md step 11).
  if (line.includes('—'))
    return {
      verdict: VERDICT.PROSE_FLAG,
      layer: 'mechanical',
      words,
      reason: 'Contains an em-dash. The tell-purge bans them; use a full stop.',
    }

  return { verdict: VERDICT.PASS, layer: 'mechanical', words }
}

// ---------------------------------------------------------------------------
// Layer 2 — judgment. Runs only on what survived layer 1.
// ---------------------------------------------------------------------------

const SYSTEM = `You are the Consistency Verifier for a narrative pipeline.

You check one line against ONE guardrail and report. You never rewrite, never suggest
replacement wording, and never comment on whether the line is good. Whether a line
lands is the human gate's call, not yours.

${ENFORCED_CHECK.name} is check ${ENFORCED_CHECK.id}: ${ENFORCED_CHECK.rule}

The defect that matters most is a soul speaking ANOTHER soul's channel. It survives
every mechanical check, and it is the reason this check exists. A line can be well
written, in range, and correct about the facts, and still be wrong because the warmth
in it arrives the way a different neighbour's warmth arrives.

Return ONLY JSON:
{
  "verdict": "PASS" | "PROSE_FLAG" | "STRUCTURAL_FLAG",
  "reason": "one or two sentences, concrete, quoting the words at fault",
  "channel_observed": "how warmth actually arrives in this line, in a few words",
  "rival_match": "npc_id whose channel this matches, or null"
}

PROSE_FLAG when re-wording the line inside the same beat can fix it.
STRUCTURAL_FLAG when it cannot — when the beat the slot was given requires the soul
to act against its card. That is a scene-spec problem and goes back to the Architect.
PASS when the warmth arrives by this soul's own channel, or when the line carries no
warmth beat at all and is not required to.`

export async function evaluateVoice(slot, line, card) {
  const rivals = rivalChannels(card.npc_id)

  const user = [
    `## The soul: ${card.npc_id}`,
    '',
    `**Declared warmth_channel:** ${card.enforcement.warmth_channel}`,
    '',
    `**Declared precision_profile:** ${card.enforcement.precision_profile}`,
    '',
    `**Declared deflection_target:** ${card.enforcement.deflection_target}`,
    '',
    '## The other souls in this town, for contrast',
    '',
    ...rivals.map((r) => `- **${r.npc_id}:** ${r.warmth_channel}`),
    '',
    '## The slot',
    '',
    `- **slot_type:** ${slot.slot_type} · **tone:** ${slot.tone}`,
    `- **scene:** ${slot.scene_context}`,
    `- **this slot must:** ${slot.beat}`,
    '',
    '## The line to check',
    '',
    line,
  ].join('\n')

  const out = await askJson(SYSTEM, user, {
    model: MODELS.evaluate,
    maxTokens: 700,
    label: `verify-${slot.slot_id}`,
  })

  if (!Object.values(VERDICT).includes(out.verdict))
    return {
      verdict: VERDICT.STRUCTURAL_FLAG,
      layer: 'voice',
      reason: `Verifier returned an unknown verdict "${out.verdict}". Treated as unshippable.`,
    }

  return { ...out, layer: 'voice' }
}

/** Both layers, cheap one first. Layer 2 never runs on a line layer 1 already rejected. */
export async function evaluate(slot, line, card) {
  const mech = evaluateMechanical(slot, line)
  if (mech.verdict !== VERDICT.PASS) return mech
  const voice = await evaluateVoice(slot, line, card)
  return { ...voice, words: mech.words }
}
