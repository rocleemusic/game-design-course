// Role-goal advancement (D7 blocker fix — gdd/03-core-loop.md:31-41).
//
// GUARDRAIL, not a preference (03-core-loop.md:37,41 · choice-node-schema.md
// "how a dialogue choice feeds the tier"): the festival tier is moved by a
// soul's EXTERNAL role goal only. The soul's inner arc moves nothing on it,
// and no stored scalar may record which dialogue options the player picked —
// "a tier readout that sums dialogue picks is exactly the niceness-meter
// failure the schema forbids." So every function below reads exactly one
// signal: has a thread tagged as a role's goal_thread moved this life? They
// never read bond (world.ts's hidden per-soul count) and never tally which
// option a player chose.
//
// role-workplace.json ships each role's `goal_threads` pre-authored: only the
// thread_id(s) a real scene's state_actions actually moves for a soul dealt
// that role (arc-festival-slice.md's "Threads to Not Drop" table). A role
// with none authored yet is a real content gap — `goalAuthored: false` below
// reports that explicitly, so a caller can tell "nobody has written this
// role's goal content yet" apart from "the player hasn't done it".
//
// Previously `role_goals_advanced` existed only as a piece of stamped prose
// in the Arch's promotes_to condition text (tuning.ts's
// archPromoteCondition) — never evaluated, never backed by data. This file
// is the actual, testable predicate; archPromoteCondition's text stamp is
// untouched (wiring role_goals_advanced(N) into the Arch's ink guard is the
// separate, still-provisional arch-promote-proposal.json change, out of
// scope here).

import type { RoleWorkplace, Soul } from "./types.ts";

export interface RoleGoalStatus {
  soul_id: string;
  role_tag: string | undefined;
  goal: string | undefined;
  /** true only when the dealt role ships at least one goal_thread to test */
  goal_authored: boolean;
  /** which of the role's goal_threads have moved at least once */
  moved_via: string[];
  advanced: boolean;
}

/** The role-workplace row for a role_tag, or undefined (soul has no dealt role, or the tag is unknown). */
export function roleWorkplaceFor(
  roleWorkplace: RoleWorkplace[],
  roleTag: string | undefined,
): RoleWorkplace | undefined {
  if (!roleTag) return undefined;
  return roleWorkplace.find((r) => r.role_tag === roleTag);
}

/**
 * One soul's live role-goal status. `movedThreadIds` is the set of thread_ids
 * that have moved at least once this life (WorldState.movedThreads() on the
 * host side) — the only external signal this reads.
 */
export function soulRoleGoalStatus(
  soul: Soul,
  roleWorkplace: RoleWorkplace[],
  movedThreadIds: ReadonlySet<string>,
): RoleGoalStatus {
  const role = roleWorkplaceFor(roleWorkplace, soul.role_tag);
  const goalThreads = role?.goal_threads ?? [];
  const moved_via = goalThreads.filter((t) => movedThreadIds.has(t));
  return {
    soul_id: soul.soul_id,
    role_tag: soul.role_tag,
    goal: role?.goal,
    goal_authored: goalThreads.length > 0,
    moved_via,
    advanced: moved_via.length > 0,
  };
}

/** Every soul's status, in roster order. */
export function allRoleGoalStatuses(
  souls: Soul[],
  roleWorkplace: RoleWorkplace[],
  movedThreadIds: ReadonlySet<string>,
): RoleGoalStatus[] {
  return souls.map((s) => soulRoleGoalStatus(s, roleWorkplace, movedThreadIds));
}

/**
 * count of souls whose (authored) role-goal has advanced at least one stage
 * this life — the ROLE_GOALS_ADVANCED_MIN input arch-promote-proposal.json
 * names. Souls with no dealt role, or a dealt role with no goal_threads
 * authored, never count (there is nothing there to have "advanced").
 */
export function roleGoalsAdvancedCount(
  souls: Soul[],
  roleWorkplace: RoleWorkplace[],
  movedThreadIds: ReadonlySet<string>,
): number {
  return allRoleGoalStatuses(souls, roleWorkplace, movedThreadIds).filter((s) => s.advanced).length;
}
