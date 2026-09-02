import type { Graph, Scene } from "../types";

/**
 * The week model (W3) — a whole life's arc, scenes grouped by day and joined by
 * the threads that run between them.
 *
 * Pure and DOM-free, so it tests deeply while the view around it stays thin.
 *
 * NO SCHEMA CHANGE. A scene is never pinned to a day: `day >= N` is one of the
 * nine compiling predicates, and availability is a FLOOR, not a pin. So a
 * scene's day is DERIVED from the lowest `day >= N` across its choice nodes,
 * defaulting to 1 — meaning "available from here on", which is why a missed
 * beat can still be caught later.
 */

/** `day >= 4`, and the other comparators the predicate compiler accepts. */
const DAY_CONDITION = /^day\s*(>=|<=|==|=|>|<)\s*(\d+)$/;

/**
 * The earliest day a scene can play.
 *
 * Only lower bounds move the floor. `day <= 3` is an upper bound — it closes a
 * window rather than opening one — so it must not push a scene later, or a
 * "days 2-3 only" beat would sort as though it began on day 3.
 */
/**
 * Two different quantifiers, and mixing them up is easy:
 *   WITHIN one beat, every condition must hold  -> the beat's floor is the MAX
 *                                                  of its lower bounds.
 *   ACROSS beats, any one opening is enough     -> the scene's floor is the MIN
 *                                                  of its beats' floors.
 * Maxing across beats would say a scene with an early beat and a `day >= 4`
 * beat begins on day 4, when in fact it opens on day 1 and simply gets richer.
 */
function nodeFloor(conditions: string[]): number {
  let floor = 1;
  for (const cond of conditions) {
    const m = DAY_CONDITION.exec(cond.trim());
    if (!m) continue;
    const [, op, n] = m;
    if (op === ">=" || op === "==" || op === "=") floor = Math.max(floor, Number(n));
    else if (op === ">") floor = Math.max(floor, Number(n) + 1);
  }
  return floor;
}

/** A beat's last day, or null when nothing closes it. */
function nodeCeiling(conditions: string[]): number | null {
  let ceiling: number | null = null;
  for (const cond of conditions) {
    const m = DAY_CONDITION.exec(cond.trim());
    if (!m) continue;
    const [, op, n] = m;
    const v =
      op === "<" ? Number(n) - 1
      : op === "<=" ? Number(n)
      : op === "==" || op === "=" ? Number(n)
      : null;
    if (v !== null) ceiling = ceiling === null ? v : Math.min(ceiling, v);
  }
  return ceiling;
}

export function sceneDay(scene: Scene): number {
  if (scene.choice_nodes.length === 0) return 1;
  return Math.min(...scene.choice_nodes.map((n) => nodeFloor(n.availability_conditions ?? [])));
}

/**
 * The last day a scene can play, or null when it never closes.
 *
 * Mirror of the above: a scene stays open while ANY beat can still play, so one
 * uncapped beat keeps the whole scene uncapped.
 */
export function sceneLastDay(scene: Scene): number | null {
  if (scene.choice_nodes.length === 0) return null;
  const ceilings = scene.choice_nodes.map((n) => nodeCeiling(n.availability_conditions ?? []));
  if (ceilings.some((c) => c === null)) return null;
  return Math.max(...(ceilings as number[]));
}

/** Threads a scene moves, in first-appearance order. */
export function sceneThreads(scene: Scene): string[] {
  const out: string[] = [];
  for (const node of scene.choice_nodes) {
    for (const opt of node.options) {
      for (const action of opt.state_actions ?? []) {
        const m = /^thread_move\((.+)\)$/.exec(String(action));
        if (m && !out.includes(m[1])) out.push(m[1]);
      }
    }
  }
  return out;
}

/** Bands a scene branches on — a band-gated scene is an arc turn. */
export function sceneBands(scene: Scene): string[] {
  const out: string[] = [];
  for (const node of scene.choice_nodes) {
    for (const cond of node.availability_conditions ?? []) {
      const m = /^bond_band\([^)]+\)\s*=\s*(low|mid|high)$/.exec(cond.trim());
      if (m && !out.includes(m[1])) out.push(m[1]);
    }
  }
  return out;
}

export interface WeekScene {
  scene_id: string;
  soul: string;
  screen_id: string;
  day: number;
  /** null when the scene never closes — catch-up is the default */
  lastDay: number | null;
  beats: number;
  threads: string[];
  /** non-empty when the scene branches on bond_band: an arc turn */
  bands: string[];
  /** how many bond_events the scene can award at most */
  bondBeats: number;
}

export interface WeekDay {
  day: number;
  scenes: WeekScene[];
}

export interface ThreadLine {
  thread_id: string;
  /** scene_ids that move this thread, in day order */
  scenes: string[];
  souls: string[];
}

export interface WeekModel {
  days: WeekDay[];
  threads: ThreadLine[];
  /** souls with at least one scene, in first-appearance order */
  souls: string[];
  /** scenes that can never open — reported rather than hidden */
  unreachable: string[];
}

function bondBeatsOf(scene: Scene): number {
  let n = 0;
  for (const node of scene.choice_nodes) {
    for (const opt of node.options) {
      for (const action of opt.state_actions ?? []) {
        if (/^bond_event\(/.test(String(action))) n++;
      }
    }
  }
  return n;
}

/**
 * Build the week.
 *
 * `days` is how long a life runs — from graph.day_loop when the resolver
 * stamped it, defaulting to 5. A scene whose floor lands past the end of the
 * life is listed as unreachable rather than silently dropped off the view: a
 * scene that cannot open is exactly the thing a structural review needs to see.
 */
export function buildWeek(graph: Graph, days = graph.day_loop?.days_per_life ?? 5): WeekModel {
  const scenes: WeekScene[] = graph.scenes.map((scene) => ({
    scene_id: scene.scene_id,
    soul: scene.soul,
    screen_id: scene.screen_id,
    day: sceneDay(scene),
    lastDay: sceneLastDay(scene),
    beats: scene.choice_nodes.length,
    threads: sceneThreads(scene),
    bands: sceneBands(scene),
    bondBeats: bondBeatsOf(scene),
  }));

  const unreachable = scenes
    .filter((s) => s.day > days || (s.lastDay !== null && s.lastDay < s.day))
    .map((s) => s.scene_id);
  const reachable = scenes.filter((s) => !unreachable.includes(s.scene_id));

  const byDay: WeekDay[] = [];
  for (let day = 1; day <= days; day++) {
    byDay.push({
      day,
      scenes: reachable
        .filter((s) => s.day === day)
        .sort((a, b) => a.soul.localeCompare(b.soul) || a.scene_id.localeCompare(b.scene_id)),
    });
  }

  const threadMap = new Map<string, ThreadLine>();
  for (const s of [...reachable].sort((a, b) => a.day - b.day || a.scene_id.localeCompare(b.scene_id))) {
    for (const t of s.threads) {
      let line = threadMap.get(t);
      if (!line) threadMap.set(t, (line = { thread_id: t, scenes: [], souls: [] }));
      line.scenes.push(s.scene_id);
      if (!line.souls.includes(s.soul)) line.souls.push(s.soul);
    }
  }

  const souls: string[] = [];
  for (const s of scenes) if (!souls.includes(s.soul)) souls.push(s.soul);

  return { days: byDay, threads: [...threadMap.values()], souls, unreachable };
}
