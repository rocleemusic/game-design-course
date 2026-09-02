import type { Graph, RoleWorkplace, Soul } from "../types";

/**
 * Role-goal advancement + the festival-tier readout (D7,
 * gdd/03-core-loop.md:31-41).
 *
 * GUARDRAIL, not a preference (03-core-loop.md:37,41 · choice-node-schema.md
 * "how a dialogue choice feeds the tier"): the festival tier is moved by a
 * soul's EXTERNAL role goal only. The soul's inner arc moves nothing on it,
 * and no stored scalar may record which dialogue options the player picked —
 * "a tier readout that sums dialogue picks is exactly the niceness-meter
 * failure the schema forbids." So every function below reads exactly one
 * signal — has a thread tagged as a role's goal_thread moved this session
 * (PlayView.threadMoves, the host's own event log)? Nothing here ever reads
 * world.ts's bond count/band, and nothing sums or counts which dialogue
 * option a player chose. Mirrors resolver/src/roleGoals.ts's pure functions,
 * same precedent as world.ts mirroring tuning.ts's bond math — the two
 * packages don't share code, graph.json is the wire format between them.
 *
 * A role with no `goal_threads` authored yet (role-workplace.json) is a real
 * content gap; `goalAuthored: false` reports that explicitly rather than
 * quietly reading as "not advanced", so this panel never implies a soul's
 * role goal is stuck at zero when nobody has written that goal's content.
 */
export interface RoleGoalStatus {
  soul_id: string;
  name: string;
  role_tag: string | undefined;
  goal: string | undefined;
  goalAuthored: boolean;
  movedVia: string[];
  advanced: boolean;
}

export function roleWorkplaceFor(
  roleWorkplace: RoleWorkplace[] | undefined,
  roleTag: string | undefined
): RoleWorkplace | undefined {
  if (!roleTag) return undefined;
  return (roleWorkplace ?? []).find((r) => r.role_tag === roleTag);
}

export function soulRoleGoalStatus(
  soul: Soul,
  name: string,
  roleWorkplace: RoleWorkplace[] | undefined,
  threadMoves: Record<string, number>
): RoleGoalStatus {
  const role = roleWorkplaceFor(roleWorkplace, soul.role_tag);
  const goalThreads = role?.goal_threads ?? [];
  const movedVia = goalThreads.filter((t) => (threadMoves[t] ?? 0) > 0);
  return {
    soul_id: soul.soul_id,
    name,
    role_tag: soul.role_tag,
    goal: role?.goal,
    goalAuthored: goalThreads.length > 0,
    movedVia,
    advanced: movedVia.length > 0,
  };
}

/** Every soul that carries a dealt role_tag, with its live status. */
export function allRoleGoalStatuses(
  graph: Graph,
  names: Map<string, string>,
  threadMoves: Record<string, number>
): RoleGoalStatus[] {
  return (graph.souls ?? [])
    .filter((s) => s.role_tag)
    .map((s) =>
      soulRoleGoalStatus(s, names.get(s.soul_id) ?? s.soul_id, graph.role_workplace, threadMoves)
    );
}

export type FestivalTier = "quiet" | "warm" | "grand";

export interface FestivalReading {
  tier: FestivalTier;
  advanced: number;
  authored: number;
  dealt: number;
}

/**
 * PROVISIONAL threshold read. Roc has ruled the INPUT — external role-goal
 * state only — but nowhere in gdd/*.md or narrative-pipeline/*.md is there a
 * ruled cut point between "N of M role goals advanced" and Quiet/Warm/Grand
 * (confirmed by search, 2026-08-01; see PAUSED.md's note that
 * role_goals_advanced never had a literal tier-mover to hook into). This
 * function is a placeholder proportional read so the readout shows something
 * correctly-sourced rather than nothing: 0 authored-and-advanced -> quiet,
 * every authored role goal advanced -> grand, any partial -> warm. The exact
 * shape is Roc's call, not this dimension's to invent past this.
 */
export function festivalTier(statuses: RoleGoalStatus[]): FestivalReading {
  const authoredStatuses = statuses.filter((s) => s.goalAuthored);
  const advanced = authoredStatuses.filter((s) => s.advanced).length;
  const authored = authoredStatuses.length;
  const dealt = statuses.length;
  let tier: FestivalTier = "quiet";
  if (authored > 0 && advanced === authored) tier = "grand";
  else if (advanced > 0) tier = "warm";
  return { tier, advanced, authored, dealt };
}
