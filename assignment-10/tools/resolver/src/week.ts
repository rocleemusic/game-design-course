// resolveWeek: a whole life's worth of days, chained through the thread
// feedback loop (W1d).
//
// day.json has always been ONE day, and DayInput.threads is documented as "the
// host's day-end record of thread_move events" — a contract that has existed
// since the resolver was written and that nothing has ever filled. So the week
// could not react to play: a thread you deliberately moved on day 2 changed
// nothing about who stood where on day 3.
//
// This closes the loop. RULED (Roc, 2026-07-30): the week reacts.
//
// Determinism is preserved because resolveDay is seeded per (slot, life, day)
// and the only new input is the caller's own thread record. Same play, same
// week; different play, different week — which is the point.

import { resolveDay } from "./day.ts";
import { DEFAULT_TUNING, type Tuning } from "./tuning.ts";
import type { DayInput, DayJson, ResolverData, ThreadState, ThreadStatus } from "./types.ts";

export interface DayOutcome {
  /** thread_ids the player moved during this day, from the host's world state */
  moved_threads?: string[];
  /** where the player chose to spend the next day */
  picked_location?: string;
}

export interface WeekOptions {
  /** thread ids the arc opens with, so day 1 has something to guarantee */
  seedThreads?: ThreadState[];
  /** per-day outcomes; index 0 is what happened on day 1 */
  outcomes?: DayOutcome[];
}

/**
 * Fold one day's outcome into the thread record.
 *
 * A thread that moved is `live`. Threads are never marked `done` here: the
 * resolver has no way to know an arc finished, and guessing would silently drop
 * a soul out of the guarantee floor mid-week. Completion is the host's call.
 */
export function applyOutcome(threads: ThreadState[], moved: string[]): ThreadState[] {
  const movedSet = new Set(moved);
  return threads.map((t) =>
    movedSet.has(t.thread_id) && t.status === "unstarted"
      ? { ...t, status: "live" as ThreadStatus }
      : t,
  );
}

/**
 * Resolve every day of one life, feeding each day's thread moves into the next.
 *
 * `seedThreads` matters more than it looks: the guarantee floor only holds a
 * soul whose thread is already `live`, so a life that starts with everything
 * `unstarted` guarantees nobody on day 1 and the arc can never open. Callers
 * that want the arc to start seed its threads live — which is a host decision,
 * not a resolver one, and is why it is a parameter rather than a default.
 */
export function resolveWeek(
  data: ResolverData,
  base: Omit<DayInput, "day">,
  tuning: Tuning = DEFAULT_TUNING,
  options: WeekOptions = {},
): DayJson[] {
  const days = tuning.day_loop.days_per_life;
  let threads: ThreadState[] = options.seedThreads
    ? structuredClone(options.seedThreads)
    : structuredClone(base.threads);
  let pickedLocation = base.picked_location;

  const out: DayJson[] = [];
  for (let day = 1; day <= days; day++) {
    const input: DayInput = {
      ...base,
      day,
      picked_location: pickedLocation,
      threads: structuredClone(threads),
    };
    out.push(resolveDay(data, input, tuning));

    const outcome = options.outcomes?.[day - 1];
    if (outcome?.moved_threads?.length) {
      threads = applyOutcome(threads, outcome.moved_threads);
    }
    if (outcome?.picked_location) pickedLocation = outcome.picked_location;
  }
  return out;
}

/**
 * Every thread the authored content can move, seeded live for the soul that
 * carries it. This is the "the arc is running" starting state — without it the
 * floor guarantees nobody and no scene is reachable on day 1.
 */
export function seedThreadsFromContent(data: ResolverData): ThreadState[] {
  const seen = new Map<string, string>();
  for (const scene of data.sceneGraph.scenes) {
    for (const node of scene.choice_nodes) {
      for (const opt of node.options) {
        for (const action of opt.state_actions ?? []) {
          if (action.type === "thread_move" && !seen.has(action.arg)) {
            seen.set(action.arg, scene.soul);
          }
        }
      }
    }
  }
  return [...seen].map(([thread_id, soul]) => ({ thread_id, soul, status: "live" as ThreadStatus }));
}
