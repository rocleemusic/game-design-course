#!/usr/bin/env node
/**
 * score.mjs — where the UI Evaluator's SCORE comes from.
 *
 * The Evaluator (the UI Verifier seat) never invents a number. It looks at a
 * rendered screenshot, names which rule of the game's visual style guide broke,
 * and points at the file and line. THIS file turns those named findings into a
 * SCORE out of 10 and a REASON. The arithmetic is here, in code — not in a model.
 *
 * That is the same discipline the narrative Style-Guide Agent (assignment 7,
 * first version — now `assignment-7-old/`) used for dialogue: a model judges,
 * code scores. A visual style guide is scored the same way. The rules live in
 * `gdd/14-visual-style-guide.md`; the deduction weights below are RECOVERY COST,
 * not severity-by-feel.
 *
 *   node score.mjs --table                 # print the rule table
 *   node score.mjs --replay <fixture>      # score one recorded run (offline, no render)
 *   node score.mjs --replay all            # the graded before/after set
 *
 * A fixture is the Verifier's findings for one screen, exactly as it returned
 * them from a real render. `fixtures/*.before.json` is the flagged state; the
 * matching `*.after.json` is empty — the refined screen that matched §14.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// The rules. Each is a violation of a §14 rule the Verifier can name from a
// screenshot or a grep. `cost` is recovery cost: a 2 is a grep-and-replace, a 6
// is "the screen has to be rebuilt or an asset supplied." `class` decides where
// the loop sends it — `refinable` back to the Builder, `structural` to the human
// gate, because no re-theme can conjure a missing painting.
// ---------------------------------------------------------------------------

export const RULES = {
  "type.wrong_case":        { cost: 2, class: "refinable",  s14: "§3 type · casing",     blurb: "Label lower-case where §14/convention is Title Case" },
  "token.hardcoded_hex":    { cost: 2, class: "refinable",  s14: "§2 palette",           blurb: "A raw #hex/0x literal instead of a COLOR token" },
  "palette.off_brand_fill": { cost: 4, class: "refinable",  s14: "§5.2 parchment card",  blurb: "Dark `panel` fill where the card should be a light parchment page" },
  "component.wrong_family": { cost: 6, class: "refinable",  s14: "§4 button families",   blurb: "Ad-hoc control (bracket text) instead of a §14 button pill" },
  "layout.mismatch":        { cost: 6, class: "refinable",  s14: "§5 panels & cards",    blurb: "Layout is not the one the design calls for (a panel where the book is)" },
  "motion.render_bug":      { cost: 6, class: "refinable",  s14: "§7 VFX containment",   blurb: "A render defect only the screenshot shows — tsc/vitest are green" },
  // legibility scales with how far below the AA contrast floor the text sits, so
  // a barely-washed subtitle and an unreadable one do not score the same.
  "legibility.contrast":    { cost: 6, class: "refinable",  s14: "§3 type · legibility", blurb: "Text below the 4.5:1 AA floor over its own backdrop", scales: "contrast" },
  "asset.missing":          { cost: 6, class: "structural", s14: "§9 art",               blurb: "A required painted asset does not exist yet — no re-theme can supply it" },
  "reference.defect":       { cost: 6, class: "structural", s14: "§5 panels & cards",    blurb: "The reference the screen copied is itself off-brand — a human must rule" },
};

const CAP = 6; // no single finding can cost more than a full structural miss

/** Recovery cost of one finding. Legibility scales by contrast deficit below
 *  the 4.5:1 AA floor (2 per point, floored at 2, capped at 6), so severity is
 *  continuous — the reason the grade is not a pass/fail test wearing a number. */
export function costOf(finding) {
  const rule = RULES[finding.rule];
  if (!rule) throw new Error(`Unknown rule: ${finding.rule}`);
  if (rule.scales === "contrast" && typeof finding.contrast === "number") {
    return Math.min(CAP, Math.max(2, Math.round((4.5 - finding.contrast) * 2)));
  }
  return rule.cost;
}

export const VERDICT = {
  PASS: "PASS",              // 10/10, ships
  FIDELITY_FLAG: "FIDELITY", // refinable — back to the Builder with the reason
  STRUCTURAL_FLAG: "STRUCTURAL", // a human must act — stop the loop
};

/**
 * Score one screen from its findings. SCORE = 10 − Σ recovery cost (floored at
 * 0). The VERDICT routes on the KIND of finding, never on the number: one
 * structural miss stops the loop even at a decent score, because the Builder
 * cannot fix it by trying again.
 */
export function score(findings) {
  if (!findings.length) {
    return { score: 10, verdict: VERDICT.PASS, reason: "No rule in the style guide was broken. Matches §14." };
  }
  const deductions = findings.map((f) => ({ f, cost: costOf(f) }));
  const total = deductions.reduce((s, d) => s + d.cost, 0);
  const value = Math.max(0, 10 - total);
  const structural = findings.some((f) => RULES[f.rule].class === "structural");
  const verdict = structural ? VERDICT.STRUCTURAL_FLAG : VERDICT.FIDELITY_FLAG;
  const reason = deductions
    .map(({ f, cost }) => `[-${cost}] ${f.rule} (${RULES[f.rule].s14}): ${f.evidence}${f.file ? ` — ${f.file}${f.line ? `:${f.line}` : ""}` : ""}`)
    .join("\n              ");
  return { score: value, verdict, reason };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function fmt(name, r) {
  const pad = (s, n) => String(s).padEnd(n);
  return `SCORE ${String(r.score).padStart(2)}/10 | ${pad(r.verdict, 10)} | ${name}\n              ${r.reason}`;
}

function replay(which) {
  const dir = join(HERE, "fixtures");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const pick = which === "all" ? files : files.filter((f) => f.startsWith(which));
  if (!pick.length) {
    console.error(`No fixture matches "${which}". Available:\n  ${files.map((f) => f.replace(/\.json$/, "")).join("\n  ")}`);
    process.exit(1);
  }
  for (const file of pick.sort()) {
    const findings = JSON.parse(readFileSync(join(dir, file), "utf8"));
    console.log(fmt(file.replace(/\.json$/, ""), score(findings)));
    console.log("");
  }
}

function table() {
  console.log("§14 UI style-guide rules — recovery cost, and where the loop sends each\n");
  for (const [id, r] of Object.entries(RULES)) {
    console.log(`  [-${r.cost}${r.scales ? "*" : " "}] ${id.padEnd(24)} ${r.class.padEnd(11)} ${r.s14}`);
    console.log(`        ${r.blurb}`);
  }
  console.log("\n  * scales with severity (contrast deficit below the 4.5:1 AA floor)");
}

const arg = process.argv[2];
if (arg === "--table") table();
else if (arg === "--replay") replay(process.argv[3] ?? "all");
else {
  console.log("usage: node score.mjs --table | --replay <fixture|all>\n");
  table();
}
