// CIRCUIT BREAKER — decides whether to keep spending.
//
// Four distinct trips, and the second is the one that matters:
//
//   PREFLIGHT   card-lint fails      → never generate at all
//   STRUCTURAL  re-wording can't fix → leave the loop, route up to the Architect
//   EXHAUSTED   2 revisions used     → park the slot unshipped
//   FALLBACK    repeat failure       → escalate the model instead of repeating a call
//
// A retry counter alone is not a circuit breaker. The useful question is not "how
// many times have I tried" but "is trying again capable of working". A structural
// flag names a cause the generator cannot address — a beat that requires the soul to
// act against its own card — so sending it back for a re-word burns two calls and
// returns a differently-worded version of the same defect. It exits instead.
//
// The cap of 2 is the pipeline's own (narrative-pipeline/agents/orchestrator.md).

import { MAX_REVISIONS, MODELS } from './config.js'
import { cardLint } from './cardlint.js'
import { VERDICT } from './evaluate.js'

export const TRIP = {
  PREFLIGHT: 'PREFLIGHT',
  STRUCTURAL: 'STRUCTURAL',
  EXHAUSTED: 'EXHAUSTED',
}

/**
 * Pre-flight. The pinned card is the ambient prose style for every line the soul
 * will ever speak, so a dirty card poisons the whole batch — the Orchestrator's
 * rule is that a card-lint failure blocks dispatch. The breaker can trip before a
 * single token is spent, which is the cheapest possible failure.
 */
export function preflight() {
  const lint = cardLint()
  if (lint.ok) return { ok: true, detail: `${lint.checked} cards checked` }

  return {
    ok: false,
    trip: TRIP.PREFLIGHT,
    reason: 'card-lint failed — the pinned cards are dirty. Dispatch blocked before generation.',
    detail: lint.defects.join('\n'),
  }
}

/**
 * After each evaluation, decide what happens next.
 * Returns one of: { action: 'ship' | 'refine' | 'stop' }.
 */
export function decide(result, revision) {
  if (result.verdict === VERDICT.PASS) return { action: 'ship' }

  if (result.verdict === VERDICT.STRUCTURAL_FLAG)
    return {
      action: 'stop',
      trip: TRIP.STRUCTURAL,
      reason:
        'Structural flag — re-wording cannot fix this. Routed up to the Architect as a ' +
        'new prepared input, not back to the generator.',
    }

  if (revision >= MAX_REVISIONS)
    return {
      action: 'stop',
      trip: TRIP.EXHAUSTED,
      reason: `${MAX_REVISIONS} revisions used and still flagged. Slot parked unshipped for the human gate.`,
    }

  return { action: 'refine' }
}

/**
 * Model fallback. Repeating an identical call is a wasted retry, so the last
 * permitted revision escalates the model instead of asking the same one again.
 */
export function modelFor(revision) {
  return revision >= MAX_REVISIONS ? MODELS.generateFallback : MODELS.generate
}
