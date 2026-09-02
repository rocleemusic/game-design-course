import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadData, PACKAGE_ROOT } from "../src/data.ts";
import { buildGraph } from "../src/graph.ts";
import { loadTuning } from "../src/tuning.ts";
import {
  allRoleGoalStatuses,
  roleGoalsAdvancedCount,
  roleWorkplaceFor,
  soulRoleGoalStatus,
} from "../src/roleGoals.ts";
import type { RoleWorkplace, Soul } from "../src/types.ts";

const DATA_DIR = join(PACKAGE_ROOT, "data");

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

test("soulRoleGoalStatus: a moved goal_thread reads as advanced", () => {
  const toby: Soul = { soul_id: "toby", role_tag: "Baker" };
  const status = soulRoleGoalStatus(toby, ROLES, new Set(["giver-receive"]));
  assert.equal(status.goal_authored, true);
  assert.equal(status.advanced, true);
  assert.deepEqual(status.moved_via, ["giver-receive"]);
  assert.equal(status.goal, "Prepares the communal feast");
});

test("soulRoleGoalStatus: the role's goal_thread not yet moved reads as not advanced", () => {
  const toby: Soul = { soul_id: "toby", role_tag: "Baker" };
  const status = soulRoleGoalStatus(toby, ROLES, new Set());
  assert.equal(status.goal_authored, true, "the role DOES carry authored goal content");
  assert.equal(status.advanced, false);
  assert.deepEqual(status.moved_via, []);
});

test("soulRoleGoalStatus: a role with no goal_threads authored is a content gap, not a false score", () => {
  const ilsa: Soul = { soul_id: "ilsa", role_tag: "Blacksmith" };
  // Even with unrelated threads moved (her own personal-arc thread), an
  // un-authored role goal must never read as advanced.
  const status = soulRoleGoalStatus(ilsa, ROLES, new Set(["kinbound-absence"]));
  assert.equal(status.goal_authored, false);
  assert.equal(status.advanced, false);
});

test("soulRoleGoalStatus: a soul with no dealt role_tag has no goal at all", () => {
  const mara: Soul = { soul_id: "mara" };
  const status = soulRoleGoalStatus(mara, ROLES, new Set(["giver-receive"]));
  assert.equal(status.role_tag, undefined);
  assert.equal(status.goal, undefined);
  assert.equal(status.goal_authored, false);
  assert.equal(status.advanced, false);
});

test("GUARDRAIL: moving a thread that is NOT in the role's goal_threads never advances it — bond/inner-arc threads must not leak into the tier", () => {
  const ilsa: Soul = { soul_id: "ilsa", role_tag: "Blacksmith" };
  // kinbound-absence is Ilsa's inner/personal-pressure thread, authored on
  // her scenes — it must never count toward her EXTERNAL Blacksmith goal,
  // even though it is a thread_move on a scene of hers.
  const status = soulRoleGoalStatus(ilsa, ROLES, new Set(["kinbound-absence", "giver-receive"]));
  assert.equal(status.advanced, false, "Ilsa's role has no goal_threads; nothing may advance it by accident");
});

test("roleWorkplaceFor: looks up by role_tag, undefined for no tag / unknown tag", () => {
  assert.equal(roleWorkplaceFor(ROLES, "Baker")!.goal, "Prepares the communal feast");
  assert.equal(roleWorkplaceFor(ROLES, undefined), undefined);
  assert.equal(roleWorkplaceFor(ROLES, "Postman"), undefined);
});

test("allRoleGoalStatuses / roleGoalsAdvancedCount: counts only authored, moved role goals", () => {
  const souls: Soul[] = [
    { soul_id: "toby", role_tag: "Baker" },
    { soul_id: "ilsa", role_tag: "Blacksmith" },
    { soul_id: "mara" }, // no dealt role
  ];
  const moved = new Set(["giver-receive"]);
  const statuses = allRoleGoalStatuses(souls, ROLES, moved);
  assert.equal(statuses.length, 3);
  assert.equal(roleGoalsAdvancedCount(souls, ROLES, moved), 1, "only toby's Baker goal has both content and a moved thread");
  assert.equal(roleGoalsAdvancedCount(souls, ROLES, new Set()), 0);
});

// ---------- real data/ ----------

test("real data: buildGraph carries role_workplace through, like bond and souls", () => {
  const data = loadData(DATA_DIR, []);
  const tuning = loadTuning(DATA_DIR, []);
  const graph = buildGraph(data, tuning);
  assert.deepEqual(graph.role_workplace, data.roleWorkplace, "stamped at build, same precedent as bond");
  assert.ok(graph.role_workplace.length > 0);
});

test("real data: toby is dealt Baker, and toby-feast-short is his role's authored goal_thread", () => {
  const data = loadData(DATA_DIR, []);
  const toby = data.sceneGraph.souls.find((s) => s.soul_id === "toby")!;
  assert.equal(toby.role_tag, "Baker", "gdd/03-core-loop.md:35 — the Giver dealt the Baker");
  const status = soulRoleGoalStatus(toby, data.roleWorkplace, new Set(["toby-feast-short"]));
  assert.equal(status.goal_authored, true);
  assert.equal(status.advanced, true);
});

// Roc ratified Toby's thread registry on 2026-08-04 and retired `giver-receive`;
// role-workplace.json now names `toby-feast-short`. v01's authored content was NOT
// re-authored, so it still emits the old id — the data and the content disagree on
// purpose until v01 is rewritten. This test pins that gap so it cannot be forgotten:
// a life that moves only the retired id does not advance the Baker's goal.
// Delete this test when v01 stops emitting `giver-receive`.
test("real data: the retired giver-receive id no longer advances the Baker's goal", () => {
  const data = loadData(DATA_DIR, []);
  const toby = data.sceneGraph.souls.find((s) => s.soul_id === "toby")!;
  const status = soulRoleGoalStatus(toby, data.roleWorkplace, new Set(["giver-receive"]));
  assert.equal(status.goal_authored, true, "the role still has a thread wired — it is just a different id");
  assert.equal(status.advanced, false, "v01 content moves the retired id, which is no longer the goal thread");
});

// Was "ilsa's Blacksmith role has no goal_threads authored yet" until T9
// (festival scoring, Roc's 2026-08-23 ruling) filled it 2026-08-24 —
// `role-workplace.json`'s `goal_threads_note` on the Blacksmith row explains
// why: an empty goal_threads capped the festival tier at Warm by
// construction, since Grand needs all three role goals completable. Kept as
// a real-data test rather than deleted, so a future edit that empties the
// row again is caught the same way the old gap was.
test("real data: ilsa is dealt Blacksmith, and ilsa-forge-short is her role's authored goal_thread (filled 2026-08-24, T9)", () => {
  const data = loadData(DATA_DIR, []);
  const ilsa = data.sceneGraph.souls.find((s) => s.soul_id === "ilsa")!;
  assert.equal(ilsa.role_tag, "Blacksmith");
  // Her own authored scenes ALSO move a thread (kinbound-absence), but that
  // is her personal family-pressure thread — it must never advance the
  // Blacksmith goal by accident (the GUARDRAIL test above pins this).
  const status = soulRoleGoalStatus(ilsa, data.roleWorkplace, new Set(["kinbound-absence"]));
  assert.equal(status.goal_authored, true, "the Blacksmith role now carries ilsa-forge-short");
  assert.equal(status.advanced, false, "kinbound-absence is not the goal thread, so it hasn't moved yet");

  const advanced = soulRoleGoalStatus(ilsa, data.roleWorkplace, new Set(["ilsa-forge-short"]));
  assert.equal(advanced.advanced, true, "moving the actual goal thread advances it");
});

test("real data: Mage carries no goal_threads — personal, not civic, never feeds the tier (gdd/07-cast.md:23)", () => {
  const data = loadData(DATA_DIR, []);
  const mage = roleWorkplaceFor(data.roleWorkplace, "Mage");
  assert.ok(mage);
  assert.deepEqual(mage!.goal_threads ?? [], []);
});
