// GENERATOR — writes one slot.
//
// One prepared slot per call, which is pipeline.md step 8. The generator never sees
// the batch, never sees the checker's vocabulary, and never sees another soul's card.
// It receives exactly what card.js pins and what the slot spec declares.

import { ask } from './llm.js'
import { MODELS } from './config.js'

const SYSTEM = `You write a single line of dialogue for a cozy point-and-click adventure.

You will be given one soul's essence_descriptor and voice_register, and one slot to fill.

Rules:
- Write ONE slot. Not a scene, not options, not stage directions.
- Obey the word ceiling absolutely. It is a hard cap, not a target.
- The world dialect is plain and short: one thought per turn, facts rather than feelings.
- Never explain the character's inner life. What they do IS the characterization.
- No em-dashes. No summary openers. Every clause names something the player can picture.

Return ONLY the line itself. No quotes around it unless the slot_type is dialogue or
player_line, in which case wrap it in double quotes. No commentary, no preamble.`

export async function generate(slot, card, { revision = 0, flag = null, model } = {}) {
  const chosen = model ?? MODELS.generate

  const user = [
    `## The soul: ${card.npc_id}`,
    '',
    '**essence_descriptor**',
    card.pinned.essence_descriptor,
    '',
    '**voice_register**',
    card.pinned.voice_register,
    '',
    '## The slot',
    '',
    `- **slot_id:** ${slot.slot_id}`,
    `- **slot_type:** ${slot.slot_type}`,
    `- **tone:** ${slot.tone}`,
    `- **word ceiling:** ${slot.max_words} — hard`,
    `- **scene:** ${slot.scene_context}`,
    `- **this slot must:** ${slot.beat}`,
    slot.speaker_intent ? `- **speaker_intent:** ${slot.speaker_intent}` : null,
    '',
    // A refine pass is not a blind retry. The generator is told what failed and why,
    // and keeps everything that was not flagged — pipeline.md step 13, "revision
    // inside the same canon".
    flag
      ? [
          '## This is a revision',
          '',
          `Attempt ${revision} was rejected. Reason:`,
          '',
          flag.reason,
          '',
          flag.previous ? `The rejected line was: ${flag.previous}` : null,
          '',
          'Write a new line that fixes exactly this. Change nothing else about the beat.',
        ]
          .filter((l) => l !== null)
          .join('\n')
      : null,
  ]
    .filter((l) => l !== null)
    .join('\n')

  const text = await ask(SYSTEM, user, {
    model: chosen,
    maxTokens: 400,
    label: `generate-${slot.slot_id}-r${revision}`,
  })

  return { text: text.trim(), model: chosen, revision }
}
