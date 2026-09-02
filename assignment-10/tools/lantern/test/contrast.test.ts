/**
 * Contrast floor — the token sheet (design/tokens.html, approved 2026-07-30)
 * claims every body-text pairing holds at 4.5:1 or better. This test verifies
 * the claim against the SHIPPED values in src/styles/tokens.css, not the
 * sheet's printed numbers, and fails if any pairing drops below the floor.
 *
 * Also pins src/styles/tokenValues.ts (the drawer's defaults) to tokens.css
 * so the two sources can't drift.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TOKEN_COLORS } from "../src/styles/tokenValues";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "../src/styles/tokens.css"), "utf-8");

/** every `--name: #rrggbb` literal in tokens.css */
function parseHexTokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

const tokens = parseHexTokens(css);

/* ---- WCAG 2.x relative luminance + contrast ratio ---- */

function luminance(hex: string): number {
  const chan = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function ratio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---- the sheet's claimed text pairings (its contrast table) ---- */

const SHEET_PAIRINGS: [fg: string, bg: string, use: string][] = [
  ["ink", "cream", "body text, paper side"],
  ["milk", "night", "body text, night side"],
  ["muted", "cream", "labels"],
  ["gold", "night", "glow + satisfied chips"],
  ["forest-deep", "cream", "approved text"],
  ["dusk-deep", "cream", "edited text"],
  ["teal", "cream", "interactive text"],
  ["clay", "cream", "flag labels"],
];

/* pairings the app adds on top of the sheet's table */
const APP_PAIRINGS: [fg: string, bg: string, use: string][] = [
  ["ink", "paper", "card body text"],
  ["muted", "paper", "card labels"],
  ["milk-soft", "night", "muted text on night"],
  ["gold-ink", "paper", "visited/current state labels"],
  ["forest-deep", "paper", "approved card title"],
  ["dusk-deep", "paper", "edited state label"],
  ["clay", "paper", "flagged state label"],
  ["teal", "paper", "choice buttons, links"],
  ["paper", "forest", "filled Approve pill text"],
];

describe("contrast floor (4.5:1 body text)", () => {
  it("tokens.css defines every color the pairings reference", () => {
    const referenced = new Set(
      [...SHEET_PAIRINGS, ...APP_PAIRINGS].flatMap(([f, b]) => [f, b])
    );
    for (const name of referenced) {
      expect(tokens[name], `--${name} missing from tokens.css`).toMatch(
        /^#[0-9a-f]{6}$/
      );
    }
  });

  it.each(SHEET_PAIRINGS)(
    "sheet claim holds: %s on %s (%s)",
    (fg, bg, _use) => {
      const r = ratio(tokens[fg], tokens[bg]);
      expect(
        r,
        `--${fg} (${tokens[fg]}) on --${bg} (${tokens[bg]}) = ${r.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(APP_PAIRINGS)("app pairing holds: %s on %s (%s)", (fg, bg, _use) => {
    const r = ratio(tokens[fg], tokens[bg]);
    expect(
      r,
      `--${fg} (${tokens[fg]}) on --${bg} (${tokens[bg]}) = ${r.toFixed(2)}:1`
    ).toBeGreaterThanOrEqual(4.5);
  });

  // The sheet marks amber and blossom decorative-only ("never body text").
  // Nothing to assert at 4.5 — instead pin that they'd FAIL as body text, so
  // anyone promoting them to text is forced through this test.
  it("amber and blossom stay decorative on cream (below the body floor)", () => {
    expect(ratio(tokens["amber"], tokens["cream"])).toBeLessThan(4.5);
    expect(ratio(tokens["blossom"], tokens["cream"])).toBeLessThan(4.5);
  });

  // dim (unvisited) cards are de-emphasized by design (~2.9:1) and restore
  // full ink-on-paper contrast on hover — intentionally not held to 4.5.

  it("drawer defaults (tokenValues.ts) match tokens.css exactly", () => {
    for (const [name, hex] of Object.entries(TOKEN_COLORS)) {
      expect(tokens[name], `--${name}`).toBe(hex.toLowerCase());
    }
    expect(Object.keys(TOKEN_COLORS)).toHaveLength(18);
  });
});
