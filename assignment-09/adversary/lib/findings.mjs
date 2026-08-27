/**
 * Builds one finding, and keeps the report from repeating itself.
 *
 * THE REPORT IS THE DELIVERABLE. A run that finds a real bug and then prints it
 * four hundred times has found nothing anyone can act on — an invariant that
 * breaks on step 12 usually keeps breaking on every step after, because the
 * state stays broken. So findings are deduped on `(invariant, location, a
 * normalised summary)`, and a repeat bumps `occurrences` and records the last
 * step instead of appending a row.
 *
 * Three fields exist purely to make the finding ACTIONABLE, which is the
 * assignment's own word and also the only thing that matters to the agent that
 * has to fix it:
 *
 *   location     WHERE — screen, system, and the source file that owns it
 *   game_context WHAT THE WORLD LOOKED LIKE — day, block, moves, carry, gates
 *   repro        HOW TO GET BACK — seed plus step, which replays exactly
 */

import { invariantMeta } from "./invariants.mjs";

/** Digits and quoted ids vary run to run; the shape of the sentence does not. */
const normalise = (s) =>
  String(s)
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

export class FindingLog {
  constructor(runMeta) {
    this.runMeta = runMeta;
    this.byKey = new Map();
    this.seq = 0;
  }

  /**
   * @param {string} invariantId  an id from lib/invariants.mjs
   * @param {object} violation    { summary, location?, context? }
   * @param {object} snap         the snapshot at the moment of the violation
   * @param {object} ctx          { step, probe, actionLog }
   */
  record(invariantId, violation, snap, ctx) {
    const meta = invariantMeta(invariantId);
    if (!meta) {
      throw new Error(
        `finding recorded against unknown invariant "${invariantId}". ` +
          `Add it to INVARIANTS or PROBE_OWNED_IDS in lib/invariants.mjs first — ` +
          `the report and known-issues.json share one vocabulary on purpose.`,
      );
    }

    const location = {
      screen: snap?.screen ?? null,
      scene: snap?.sceneKey ?? null,
      system: meta.system,
      file: null,
      line: null,
      ...(violation.location ?? {}),
    };

    const key = [invariantId, location.screen, location.file, normalise(violation.summary)].join("::");
    const existing = this.byKey.get(key);
    if (existing) {
      existing.occurrences += 1;
      existing.repro.lastStep = ctx.step;
      return existing;
    }

    this.seq += 1;
    const finding = {
      id: `ADV-${String(this.seq).padStart(4, "0")}`,
      invariant: invariantId,
      title: meta.title,
      error_type: meta.errorType,
      severity: meta.severity,
      status: "new", // set by knownIssues.classify before the report is written
      occurrences: 1,
      summary: violation.summary,

      /**
       * HOW A PLAYER COULD ACTUALLY HIT THIS. The single most important field
       * for triage, and the one an adversarial tester is most tempted to fudge.
       *
       *   "player"      reached through real input — a mouse click, a keypress.
       *                 A shipping bug.
       *   "model-only"  reached by calling into the game's own objects past the
       *                 UI that normally guards them. Not a bug a player can hit
       *                 today, but a real statement about where enforcement
       *                 lives: in the button, not in the model. It becomes a
       *                 player bug the moment any second input path appears.
       *   "environment" reached by tampering with what the game reads — a
       *                 corrupted save, a cleared storage. Real, and outside the
       *                 player's intent.
       */
      reachability: violation.reachability ?? "player",

      location,

      game_context: {
        day: snap?.day ?? null,
        timeBlock: snap?.timeBlock ?? null,
        movesLeft: snap?.movesLeft ?? null,
        screen: snap?.screen ?? null,
        drawnScreen: snap?.drawnScreen ?? null,
        satchel: snap?.satchel ?? null,
        arms: snap?.arms ?? null,
        held: snap?.held ?? null,
        spellbook: snap?.spellbook ?? null,
        clearedGates: snap?.gates?.cleared ?? null,
        refusedGates: snap?.gates?.refused ?? null,
        modalOpen: snap?.modalOpen ?? null,
        choices: (snap?.choices ?? []).map((c) => c.display),
        ...(violation.context ?? {}),
      },

      repro: {
        seed: this.runMeta.seed,
        mode: this.runMeta.mode,
        step: ctx.step,
        lastStep: ctx.step,
        probe: ctx.probe ?? null,
        // The last dozen actions, so a fixer can see the run-up without
        // replaying four hundred steps to reach it.
        recentActions: (ctx.actionLog ?? []).slice(-12),
        command: `npm run adversary -- --seed ${this.runMeta.seed} --mode ${this.runMeta.mode} --steps ${this.runMeta.steps}`,
      },

      evidence: {
        screenshot: violation.screenshot ?? null,
        consoleErrors: violation.consoleErrors ?? [],
      },
    };

    this.byKey.set(key, finding);
    return finding;
  }

  all() {
    const rank = { blocking: 0, material: 1, note: 2 };
    return [...this.byKey.values()].sort(
      (a, b) => rank[a.severity] - rank[b.severity] || a.repro.step - b.repro.step,
    );
  }
}
