// Compile-check a data directory end-to-end: load -> buildGraph -> emitInk ->
// inkjs Compiler. Prints warnings, errors, and a pass/fail line.
//   node scripts/compile-check.ts [dataDir]

import { loadData } from "../src/data.ts";
import { loadTuning } from "../src/tuning.ts";
import { buildGraph } from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { compileInkFiles } from "../test/helpers/compile.ts";

const dataDir = process.argv[2];
const warnings: string[] = [];
const data = loadData(dataDir, warnings);
const tuning = loadTuning(dataDir, warnings);
for (const w of warnings) console.error(`data warning: ${w}`);

const graph = buildGraph(data, tuning);
console.log(
  `graph: ${graph.screens.length} screens, ${graph.seams.length} seams, ` +
    `${graph.scenes.length} scenes, ${graph.variables.length} variables`,
);

const files = emitInk(graph);
console.log(`ink files: ${[...files.keys()].join(", ")}`);

const { story, errors, warnings: inkWarnings } = compileInkFiles(files);
for (const w of inkWarnings) console.error(`ink warning: ${w}`);
for (const e of errors) console.error(`ink ERROR: ${e}`);

if (errors.length === 0 && story) {
  const first = story.Continue();
  console.log(`COMPILE OK — first line: ${String(first).trim()}`);
} else {
  console.error("COMPILE FAILED");
  process.exitCode = 1;
}
