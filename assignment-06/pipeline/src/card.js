// Reads a cast card and splits it into two bundles that must never mix.
//
// This is the pinning rule (narrative-pipeline/pipeline.md step 8; the Orchestrator's
// dispatch rule, 2026-08-08) expressed as code rather than as a sentence in a prompt:
//
//   GENERATOR gets  essence_descriptor + voice_register   — and nothing else
//   EVALUATOR gets  voice_enforcement + the trait axes    — and nothing else
//
// The split exists because a generator handed the checker's vocabulary writes to
// avoid flags instead of writing to sound like a person. Every line in the batch
// pays for it. A prompt can promise the split; only a function can keep it.
//
// cards/*.json carries the six fields extracted from ProjectOS/game-project/cast/*.md.
// Each file names its source card and the date it was taken.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PATHS } from './config.js'

export function loadCard(npcId) {
  const card = JSON.parse(readFileSync(join(PATHS.cards, `${npcId}.json`), 'utf8'))

  if (!card.pinned?.essence_descriptor) throw new Error(`${npcId}.json: no essence_descriptor`)
  if (!card.pinned?.voice_register) throw new Error(`${npcId}.json: no voice_register`)

  return {
    npc_id: npcId,

    // Handed to the Generator. Exactly two fields — see the pinning rule above.
    pinned: {
      essence_descriptor: card.pinned.essence_descriptor,
      voice_register: card.pinned.voice_register,
    },

    // Handed to the Evaluator only. The trait axes are what check 6 measures a
    // line against: warmth on the declared channel, precision on the declared axis.
    enforcement: {
      voice_enforcement: card.enforcement?.voice_enforcement ?? null,
      warmth_channel: card.enforcement?.warmth_channel ?? null,
      deflection_target: card.enforcement?.deflection_target ?? null,
      precision_profile: card.enforcement?.precision_profile ?? null,
    },
  }
}

// The other souls' warmth channels, which is how check 6 catches the real defect:
// a line is not wrong in isolation, it is wrong because it is doing another soul's
// job. Measured 2026-08-10 — half of Ilsa's warm beats were arriving by Toby's
// channel, and one pair was directly interchangeable between them.
export function rivalChannels(npcId, roster = ['ilsa', 'toby', 'mara']) {
  return roster
    .filter((id) => id !== npcId)
    .map((id) => {
      try {
        return { npc_id: id, warmth_channel: loadCard(id).enforcement.warmth_channel }
      } catch {
        return null // a soul without a card yet is not an error here
      }
    })
    .filter(Boolean)
}
