import { describe, expect, it } from "vitest";
import type { Graph, Scene } from "../src/types";
import { buildWeek, sceneBands, sceneDay, sceneLastDay, sceneThreads } from "../src/lib/week";

/**
 * W3 — the week model. Pure, so it tests deeply while the view stays thin.
 *
 * The load-bearing rule: a scene is never PINNED to a day. `day >= N` is a
 * floor, which is why a missed beat can be caught later, and the week view
 * derives a scene's day from that floor rather than from a new field.
 */

const scene = (id: string, patch: Partial<Scene> = {}): Scene => ({
  scene_id: id,
  soul: "toby",
  screen_id: "T2",
  ink_address: `toby.${id.toLowerCase()}`,
  lines: [],
  choice_nodes: [],
  ...patch,
});

const node = (id: string, conditions: string[] = [], actions: string[] = []) => ({
  choice_id: id,
  scene_id: "S",
  availability_conditions: conditions,
  equal_weight_note: "n",
  no_accrual_note: "n",
  options: [
    {
      option_id: `${id}-a`,
      verb_family: "Converse",
      player_verb: "witness",
      surface_action: "do",
      response_slots: [],
      state_actions: actions,
      rejoin: "gather" as const,
    },
  ],
});

describe("sceneDay — derived, never a new field", () => {
  it("defaults to day 1 when nothing gates it", () => {
    expect(sceneDay(scene("S", { choice_nodes: [node("A")] }))).toBe(1);
  });

  it("takes the LOWEST floor across the scene's beats", () => {
    const s = scene("S", { choice_nodes: [node("A", ["day >= 4"]), node("B", ["day >= 2"])] });
    // Availability is a floor: the scene opens as soon as ANY beat can play.
    expect(sceneDay(s)).toBe(2);
  });

  it("an upper bound must NOT push a scene later", () => {
    // `day <= 3` closes a window, it does not open one. Treating it as a floor
    // would sort a days-2-to-3 beat as though it began on day 3.
    const s = scene("S", { choice_nodes: [node("A", ["day >= 2", "day <= 3"])] });
    expect(sceneDay(s)).toBe(2);
    expect(sceneLastDay(s)).toBe(3);
  });

  it("handles the other comparators the predicate compiler accepts", () => {
    expect(sceneDay(scene("S", { choice_nodes: [node("A", ["day > 3"])] }))).toBe(4);
    expect(sceneDay(scene("S", { choice_nodes: [node("A", ["day == 5"])] }))).toBe(5);
    expect(sceneLastDay(scene("S", { choice_nodes: [node("A", ["day < 4"])] }))).toBe(3);
  });

  it("never closes when only a floor is set — catch-up is the default", () => {
    expect(sceneLastDay(scene("S", { choice_nodes: [node("A", ["day >= 4"])] }))).toBeNull();
  });

  it("ignores predicates that are not about the day", () => {
    const s = scene("S", { choice_nodes: [node("A", ["knows(saw_apron)", "npc_present(toby)"])] });
    expect(sceneDay(s)).toBe(1);
    expect(sceneLastDay(s)).toBeNull();
  });
});

describe("scene metadata", () => {
  it("collects threads in first-appearance order, without duplicates", () => {
    const s = scene("S", {
      choice_nodes: [
        node("A", [], ["thread_move(giver-receive)"]),
        node("B", [], ["thread_move(giver-receive)", "thread_move(kinbound-absence)"]),
      ],
    });
    expect(sceneThreads(s)).toEqual(["giver-receive", "kinbound-absence"]);
  });

  it("reads bond_band gates, which is what marks an arc turn", () => {
    const s = scene("S", {
      choice_nodes: [
        node("A", ["bond_band(toby) = low"]),
        node("B", ["bond_band(toby) = high"]),
      ],
    });
    expect(sceneBands(s).sort()).toEqual(["high", "low"]);
  });
});

describe("buildWeek", () => {
  const graph = (scenes: Scene[], days = 5): Graph => ({
    screens: [],
    seams: [],
    scenes,
    variables: [],
    day_loop: { moves_per_day: 3, days_per_life: days },
  });

  it("groups scenes under the day they can first open", () => {
    const w = buildWeek(
      graph([
        scene("SC-A", { choice_nodes: [node("A")] }),
        scene("SC-B", { choice_nodes: [node("B", ["day >= 4"])] }),
      ])
    );
    expect(w.days).toHaveLength(5);
    expect(w.days[0].scenes.map((s) => s.scene_id)).toEqual(["SC-A"]);
    expect(w.days[3].scenes.map((s) => s.scene_id)).toEqual(["SC-B"]);
  });

  it("keeps empty days in the model — an empty day is a finding", () => {
    const w = buildWeek(graph([scene("SC-A", { choice_nodes: [node("A")] })]));
    expect(w.days[1].scenes).toEqual([]);
  });

  it("reports a scene that can never open rather than dropping it", () => {
    const w = buildWeek(graph([scene("SC-LATE", { choice_nodes: [node("A", ["day >= 9"])] })]));
    expect(w.unreachable).toEqual(["SC-LATE"]);
    expect(w.days.flatMap((d) => d.scenes)).toEqual([]);
  });

  it("reports a window that closes before it opens", () => {
    const w = buildWeek(
      graph([scene("SC-BAD", { choice_nodes: [node("A", ["day >= 4", "day <= 2"])] })])
    );
    expect(w.unreachable).toEqual(["SC-BAD"]);
  });

  it("runs each thread through its scenes in day order", () => {
    const w = buildWeek(
      graph([
        scene("SC-LATE", { choice_nodes: [node("A", ["day >= 4"], ["thread_move(t)"])] }),
        scene("SC-EARLY", { choice_nodes: [node("B", [], ["thread_move(t)"])] }),
      ])
    );
    expect(w.threads).toHaveLength(1);
    expect(w.threads[0].scenes).toEqual(["SC-EARLY", "SC-LATE"]);
  });

  it("honours days_per_life from the graph", () => {
    const w = buildWeek(graph([scene("SC-A", { choice_nodes: [node("A")] })], 3));
    expect(w.days).toHaveLength(3);
  });

  it("defaults to a 5-day life for a graph built before W1c", () => {
    const g = graph([scene("SC-A", { choice_nodes: [node("A")] })]);
    delete g.day_loop;
    expect(buildWeek(g).days).toHaveLength(5);
  });
});
