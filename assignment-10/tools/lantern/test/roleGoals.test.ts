import { describe, expect, it } from "vitest";
import type { Graph, RoleWorkplace, Soul } from "../src/types";
import {
  allRoleGoalStatuses,
  festivalTier,
  roleWorkplaceFor,
  soulRoleGoalStatus,
} from "../src/lib/roleGoals";

/**
 * D7 — the festival-tier readout must be sourced ONLY from a soul's dealt
 * role's EXTERNAL goal thread(s), never bond, never a dialogue-pick tally
 * (gdd/03-core-loop.md:37,41). These tests pin that shape as hard as the
 * numbers, the same way world.test.ts pins the bond shape.
 */

const ROLES: RoleWorkplace[] = [
  {
    role_tag: "Baker",
    workplace_screens: ["T2"],
    time_blocks: ["morning"],
    goal: "Prepares the communal feast",
    goal_threads: ["giver-receive"],
  },
  {
    role_tag: "Blacksmith",
    workplace_screens: ["T4"],
    time_blocks: ["afternoon"],
    goal: "Forges the new Lantern Arch centerpiece",
    goal_threads: [], // no authored content yet — a real gap, not a false score
  },
];

describe("soulRoleGoalStatus", () => {
  it("reads advanced when a moved thread matches the role's own goal_threads", () => {
    const toby: Soul = { soul_id: "toby", role_tag: "Baker" };
    const status = soulRoleGoalStatus(toby, "Toby", ROLES, { "giver-receive": 2 });
    expect(status.goalAuthored).toBe(true);
    expect(status.advanced).toBe(true);
    expect(status.movedVia).toEqual(["giver-receive"]);
    expect(status.goal).toBe("Prepares the communal feast");
  });

  it("reads not-advanced when the role's goal_thread has not moved", () => {
    const toby: Soul = { soul_id: "toby", role_tag: "Baker" };
    const status = soulRoleGoalStatus(toby, "Toby", ROLES, {});
    expect(status.goalAuthored).toBe(true);
    expect(status.advanced).toBe(false);
  });

  it("a role with no goal_threads authored is a content gap, not a false score", () => {
    const ilsa: Soul = { soul_id: "ilsa", role_tag: "Blacksmith" };
    const status = soulRoleGoalStatus(ilsa, "Ilsa", ROLES, { "kinbound-absence": 1 });
    expect(status.goalAuthored).toBe(false);
    expect(status.advanced).toBe(false);
  });

  it("GUARDRAIL: a thread outside the role's own goal_threads never advances it — inner-arc/personal threads must not leak into the tier", () => {
    const ilsa: Soul = { soul_id: "ilsa", role_tag: "Blacksmith" };
    // kinbound-absence is Ilsa's inner/personal-pressure thread, authored on
    // her own scenes; giver-receive belongs to a DIFFERENT role entirely.
    // Neither may advance a role goal that does not list it.
    const status = soulRoleGoalStatus(ilsa, "Ilsa", ROLES, {
      "kinbound-absence": 3,
      "giver-receive": 1,
    });
    expect(status.advanced).toBe(false);
  });

  it("a soul with no dealt role_tag has no goal at all", () => {
    const mara: Soul = { soul_id: "mara" };
    const status = soulRoleGoalStatus(mara, "Mara", ROLES, { "giver-receive": 1 });
    expect(status.role_tag).toBeUndefined();
    expect(status.goal).toBeUndefined();
    expect(status.goalAuthored).toBe(false);
    expect(status.advanced).toBe(false);
  });
});

describe("roleWorkplaceFor", () => {
  it("looks up by role_tag; undefined for no tag or an unknown one", () => {
    expect(roleWorkplaceFor(ROLES, "Baker")?.goal).toBe("Prepares the communal feast");
    expect(roleWorkplaceFor(ROLES, undefined)).toBeUndefined();
    expect(roleWorkplaceFor(ROLES, "Postman")).toBeUndefined();
    expect(roleWorkplaceFor(undefined, "Baker")).toBeUndefined();
  });
});

function graphWith(souls: Soul[]): Graph {
  return {
    screens: [],
    seams: [],
    scenes: [],
    variables: [],
    souls,
    role_workplace: ROLES,
  };
}

describe("allRoleGoalStatuses", () => {
  it("only lists souls that carry a dealt role_tag", () => {
    const graph = graphWith([
      { soul_id: "toby", name: "Toby", role_tag: "Baker" },
      { soul_id: "mara", name: "Mara" }, // no dealt role — excluded
    ]);
    const statuses = allRoleGoalStatuses(graph, new Map([["toby", "Toby"]]), {});
    expect(statuses.map((s) => s.soul_id)).toEqual(["toby"]);
  });
});

describe("festivalTier — PROVISIONAL threshold read", () => {
  it("quiet: nothing authored-and-advanced", () => {
    const statuses = [
      { soul_id: "toby", name: "Toby", role_tag: "Baker", goal: "x", goalAuthored: true, movedVia: [], advanced: false },
    ];
    expect(festivalTier(statuses).tier).toBe("quiet");
  });

  it("grand: every authored role goal advanced", () => {
    const statuses = [
      { soul_id: "toby", name: "Toby", role_tag: "Baker", goal: "x", goalAuthored: true, movedVia: ["giver-receive"], advanced: true },
    ];
    const reading = festivalTier(statuses);
    expect(reading.tier).toBe("grand");
    expect(reading.advanced).toBe(1);
    expect(reading.authored).toBe(1);
  });

  it("warm: a partial mix of advanced and not", () => {
    const statuses = [
      { soul_id: "toby", name: "Toby", role_tag: "Baker", goal: "x", goalAuthored: true, movedVia: ["giver-receive"], advanced: true },
      { soul_id: "ilsa", name: "Ilsa", role_tag: "Blacksmith", goal: "y", goalAuthored: true, movedVia: [], advanced: false },
    ];
    expect(festivalTier(statuses).tier).toBe("warm");
  });

  it("an un-authored role goal never counts toward the tier either way", () => {
    const statuses = [
      { soul_id: "ilsa", name: "Ilsa", role_tag: "Blacksmith", goal: "y", goalAuthored: false, movedVia: [], advanced: false },
    ];
    const reading = festivalTier(statuses);
    expect(reading.tier).toBe("quiet");
    expect(reading.authored).toBe(0);
    expect(reading.dealt).toBe(1);
  });
});
