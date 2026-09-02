// gen-scene-short-names.mjs — derives src/lib/sceneShortNames.json from the
// authored line files at ../../../lantern-projects/v01/threads/lines/*.md.
//
// GP-96 (2026-08-12, Roc: "derive"): SceneRail showed bare `SC-*` addresses, so
// a scene could not be tracked back to its thread and conversation while
// playing. The readable handle Roc asked for — `toby-the-shelf-C4` — exists
// nowhere in scene-graph.json: a scene there carries only
// scene_id/soul/screen_id/lines/choice_nodes/entry_gate. It DOES exist, stated
// outright, in every line file's H1:
//
//   # `mara-said-out-loud` — C1 line slots · `SC-T2-24`
//
// so that H1 is the derivation source, and this script is the only writer of
// the generated map. Same shape as gen-thread-prose.mjs deliberately: a
// generated fixture plus a staleness test (test/sceneShortNamesFixture.test.ts)
// beats a hand-maintained second copy, which is the drift GP-92's registries
// exist to prevent.
//
// A scene with no line file (SC-T2-04, the SC-T7-* pair, the T4 forge set) is
// simply absent from the map and keeps showing its raw `SC-*` in the rail —
// the same never-hide-an-unmapped-id rule threadProse follows.
//
// Run:   npm run gen:scene-short-names    (from tools/lantern)
// Test:  test/sceneShortNamesFixture.test.ts fails if the fixture is stale.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LINES_DIR = path.resolve(
  HERE,
  "../../../lantern-projects/v01/threads/lines"
);
export const FIXTURE = path.resolve(HERE, "../src/lib/sceneShortNames.json");

/**
 * The H1 states thread id, conversation number and scene address. The middle
 * wording varies ("line slots" vs. "lines" — toby-the-shelf-C3), so only the
 * three load-bearing parts are matched.
 */
const H1 = /^#\s*`([^`]+)`\s*—\s*(C\d+)\b[^\n]*`(SC-[A-Za-z0-9-]+)`/;

export function buildSceneShortNames(linesDir = LINES_DIR) {
  const files = fs
    .readdirSync(linesDir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const out = {};
  for (const file of files) {
    const first = fs.readFileSync(path.join(linesDir, file), "utf-8").split("\n")[0];
    const m = H1.exec(first.trim());
    if (!m) throw new Error(`${file}: H1 does not state thread, conversation and scene id`);
    const [, thread, conversation, sceneId] = m;
    const short = `${thread}-${conversation}`;
    // The filename is the same fact written twice; if the two disagree, one of
    // them is stale and the map would silently pick a side. Fail instead.
    if (`${short}.md` !== file) {
      throw new Error(`${file}: H1 says ${short}, filename says ${file.replace(/\.md$/, "")}`);
    }
    if (sceneId in out) {
      throw new Error(`${file}: ${sceneId} already claimed by ${out[sceneId]}`);
    }
    out[sceneId] = short;
  }
  return out;
}

export function renderSceneShortNames(linesDir = LINES_DIR) {
  return JSON.stringify(buildSceneShortNames(linesDir), null, 2) + "\n";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(FIXTURE, renderSceneShortNames());
  console.log(`wrote ${FIXTURE} from ${LINES_DIR}`);
}
