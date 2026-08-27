/**
 * Classifies a finding as already-known, so a real new bug is not buried under
 * five copies of one Roc already logged.
 *
 * THE EXPIRY IS THE POINT. A mute list with no expiry is how a bug nobody fixed
 * reads forever as a bug somebody is fixing. Every entry carries an ISO date;
 * past it the entry stops muting and the finding comes back as `new`, carrying a
 * `lapsedKnownIssue` note that names the plan that was supposed to fix it. The
 * file cannot rot silently.
 *
 * A malformed entry is a HARD FAILURE of the run, not a warning. An entry naming
 * an invariant id that does not exist would mute nothing while looking like it
 * muted something, which is the worst of both.
 */

import fs from "node:fs";
import { allInvariantIds } from "./invariants.mjs";

export function loadKnownIssues(file, today) {
  if (!fs.existsSync(file)) return { entries: [], lapsed: [] };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`known-issues.json will not parse: ${e.message}`);
  }

  const ids = new Set(allInvariantIds());
  const entries = [];
  const lapsed = [];

  for (const [i, e] of (parsed.entries ?? []).entries()) {
    const where = `known-issues.json entry ${i}`;
    for (const k of ["invariant", "why", "ref", "expires"]) {
      if (!e[k]) throw new Error(`${where}: missing required field "${k}"`);
    }
    if (!ids.has(e.invariant)) {
      throw new Error(
        `${where}: invariant "${e.invariant}" is not in lib/invariants.mjs. ` +
          `An entry naming a non-existent id mutes nothing while looking like it does.`,
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.expires)) {
      throw new Error(`${where}: "expires" must be an ISO date (YYYY-MM-DD), got ${JSON.stringify(e.expires)}`);
    }
    if (e.expires < today) {
      lapsed.push(e);
      continue;
    }
    entries.push(e);
  }

  return { entries, lapsed };
}

/** Does this finding match an entry? Undefined match fields mean "any". */
function matches(entry, finding) {
  if (entry.invariant !== finding.invariant) return false;
  const m = entry.match;
  if (!m) return true;
  if (m.summaryIncludes && !String(finding.summary).includes(m.summaryIncludes)) return false;
  if (m.screen && finding.location?.screen !== m.screen) return false;
  if (m.system && finding.location?.system !== m.system) return false;
  return true;
}

/**
 * Returns the finding with `status` set, and — when an entry lapsed — a note
 * naming the plan that owns the overdue fix.
 */
export function classify(finding, known) {
  const live = known.entries.find((e) => matches(e, finding));
  if (live) {
    return { ...finding, status: "known", knownIssue: { why: live.why, ref: live.ref, expires: live.expires } };
  }
  const dead = known.lapsed.find((e) => matches(e, finding));
  if (dead) {
    return {
      ...finding,
      status: "new",
      lapsedKnownIssue: {
        why: dead.why,
        ref: dead.ref,
        expired: dead.expires,
        note: `This was muted as known until ${dead.expires}. That date has passed and the bug is still here — it is a new finding again.`,
      },
    };
  }
  return { ...finding, status: "new" };
}
