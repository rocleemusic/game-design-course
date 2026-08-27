/**
 * Writes the run's two report files, and nothing else.
 *
 * JSON is the real one — nested `location`, `game_context` and `repro` survive
 * intact, and a fixer agent reads it directly.
 *
 * CSV exists because the assignment asks for a format another developer can act
 * on immediately, and a spreadsheet is where triage actually happens. Nested
 * objects flatten to one column each, JSON-encoded. That is lossy on purpose —
 * the CSV is for sorting and counting, the JSON is for acting.
 *
 * `coverage` is not decoration. A report with no findings means one of two very
 * different things: the build is clean, or the loop never reached the code. The
 * coverage block is what tells them apart, and it records what was NOT reached
 * as plainly as what was.
 */

import fs from "node:fs";
import path from "node:path";

const CSV_COLUMNS = [
  "id",
  "severity",
  "status",
  "error_type",
  "reachability",
  "invariant",
  "location_screen",
  "location_system",
  "location_scene",
  "location_file",
  "location_line",
  "summary",
  "game_context",
  "repro_seed",
  "repro_step",
  "repro_probe",
  "occurrences",
  "known_ref",
];

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsvRow(f) {
  return [
    f.id,
    f.severity,
    f.status,
    f.error_type,
    f.reachability,
    f.invariant,
    f.location.screen,
    f.location.system,
    f.location.scene,
    f.location.file,
    f.location.line,
    f.summary,
    f.game_context,
    f.repro.seed,
    f.repro.step,
    f.repro.probe,
    f.occurrences,
    f.knownIssue?.ref ?? f.lapsedKnownIssue?.ref ?? null,
  ]
    .map(csvCell)
    .join(",");
}

export function writeReport(outDir, report) {
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "findings.json");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const csvPath = path.join(outDir, "findings.csv");
  const rows = [CSV_COLUMNS.join(","), ...report.findings.map(toCsvRow)];
  fs.writeFileSync(csvPath, `${rows.join("\n")}\n`, "utf8");

  return { jsonPath, csvPath };
}

/** The terminal summary. Ordered by severity, because that is the triage order. */
export function printSummary(report, log = console.log) {
  const C = { red: "\x1b[0;31m", yellow: "\x1b[1;33m", green: "\x1b[0;32m", dim: "\x1b[2m", off: "\x1b[0m" };
  const news = report.findings.filter((f) => f.status === "new");
  const known = report.findings.filter((f) => f.status === "known");

  log("");
  log(`${C.dim}────────────────────────────────────────────────────${C.off}`);
  log(`steps ${report.run.steps} · seed ${report.run.seed} · mode ${report.run.mode} · ${Math.round(report.run.durationMs / 1000)}s`);
  log(
    `screens ${report.coverage.screensVisited.length} · probes fired ${Object.values(report.coverage.probesFired).reduce((a, b) => a + b, 0)} · invariants checked ${report.coverage.invariantsChecked.length}`,
  );
  log("");

  if (news.length === 0) {
    log(`${C.green}no new findings${C.off}${known.length ? ` (${known.length} known)` : ""}`);
  } else {
    for (const f of news) {
      const badge =
        f.severity === "blocking" ? `${C.red}BLOCKING${C.off}` : f.severity === "material" ? `${C.yellow}MATERIAL${C.off}` : `${C.dim}NOTE    ${C.off}`;
      const where = [f.location.screen, f.location.system].filter(Boolean).join("/");
      const reach = f.reachability === "player" ? "" : `${C.dim} (${f.reachability})${C.off}`;
      log(`${badge}  ${f.id}  ${f.invariant}${reach}${where ? `  ${C.dim}[${where}]${C.off}` : ""}`);
      log(`          ${f.summary}`);
      if (f.lapsedKnownIssue) log(`          ${C.yellow}known-issue entry lapsed ${f.lapsedKnownIssue.expired}${C.off}`);
      if (f.occurrences > 1) log(`          ${C.dim}${f.occurrences}x, steps ${f.repro.step}-${f.repro.lastStep}${C.off}`);
    }
  }
  if (known.length) {
    log("");
    log(`${C.dim}${known.length} known issue(s) matched and suppressed: ${known.map((f) => f.invariant).join(", ")}${C.off}`);
  }
  if (report.coverage.notReached.length) {
    log("");
    log(`${C.dim}not reached this run: ${report.coverage.notReached.join(" · ")}${C.off}`);
  }
  log(`${C.dim}────────────────────────────────────────────────────${C.off}`);
}
