import { useState } from "react";
import type { Variable } from "../types";

/**
 * Variable inspector: every state variable with its readers and writers, its
 * LIVE value while a play session is running, and a set control.
 *
 * Renamed from `Inspector` per the standing L5 ruling — the node inspector
 * takes that name, and this one says what it is.
 *
 * WHY THE OVERRIDE EXISTS (Roc, 2026-07-30: "there is no override for
 * variables"). Two things need it:
 *   - Reaching a state the content cannot yet produce. SC-T7-toby and
 *     SC-T7-ilsa each branch three ways on bond_band, and a review pass has to
 *     see all three without playing two full lives to earn `high`.
 *   - Reading where you are at all. Before this the panel showed a
 *     declaration and nothing else, so mid-play there was no way to see what
 *     state you were in.
 * This also subsumes the long-deferred bond-band force-state control: once any
 * variable can be set, no bespoke bond affordance is needed.
 *
 * ONE DESIGN LAW TO KEEP IN VIEW. pipeline.md step 9: the bond "has no UI. No
 * hearts, no meter, no 'bond deepened' event." That governs the GAME. This is a
 * developer panel in a desk tool, and bondLevel_* has always appeared here as a
 * plain declared variable. A raw number in a debug list is fine; anything that
 * reads as a player-facing bond meter is the thing the rule forbids.
 */

export interface VariablesPanelProps {
  variables: Variable[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  /** live values by name; absent when no play session is running */
  values?: Record<string, unknown> | null;
  /** set a variable by hand; absent when the session cannot be steered */
  onSet?: (name: string, value: string) => void;
  /** true once anything was set by hand this session */
  forced?: boolean;
}

/** LIST values arrive as objects/arrays from inkjs; render something readable. */
function showValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * +/- steppers (D8 #6). `v.declaration` is a complete type discriminator, and
 * the three shapes graph.ts ever emits: `VAR name = 1` (numeric), `VAR name =
 * "text"` (string), `LIST Name = a, b, c` (enumerable). Only the first two
 * kinds get a stepper — a free-text VAR has no "next" value to step to.
 */
type VarKind = "number" | "string" | "list";

function declKind(declaration: string): VarKind {
  if (/^LIST\b/.test(declaration)) return "list";
  if (/^VAR\s+\S+\s*=\s*-?\d+\s*$/.test(declaration)) return "number";
  return "string";
}

/** The declared member order of a LIST var — what a stepper cycles through. */
function listMembers(declaration: string): string[] {
  const m = declaration.match(/^LIST\s+\S+\s*=\s*(.+)$/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * `bondLevel_<soul>` is host-mirrored (play.ts's mirrorBond/setVar), never a
 * free integer — ink only ever sees the coarse 0/1/2 band. A raw +/-1 on the
 * live number already lands on a real band (0, 1, or 2), so no separate
 * clamp is needed for correctness, but stepping is clamped to that range
 * anyway so the button never visibly proposes an out-of-range band before
 * play.ts's setVar silently normalizes it back.
 */
const BOND_VAR = /^bondLevel_/;

/** The next value to send through onSet, or null when this variable — a
 *  string VAR — has no steppable "next". */
function stepValue(v: Variable, current: unknown, dir: 1 | -1): string | null {
  const kind = declKind(v.declaration);
  if (kind === "number") {
    const n = Number(current);
    const base = Number.isFinite(n) ? n : 0;
    const next = base + dir;
    return String(BOND_VAR.test(v.name) ? Math.min(2, Math.max(0, next)) : next);
  }
  if (kind === "list") {
    const members = listMembers(v.declaration);
    if (members.length === 0) return null;
    const idx = members.indexOf(String(current ?? ""));
    const from = idx === -1 ? 0 : idx;
    return members[(from + dir + members.length) % members.length];
  }
  return null;
}

export function VariablesPanel(props: VariablesPanelProps) {
  const { values, onSet } = props;
  const [draft, setDraft] = useState<Record<string, string>>({});
  const live = values ?? null;

  return (
    <section className="panel" aria-label="variable inspector">
      <h2>Variables</h2>
      {props.forced && (
        <p className="var-forced" role="status">
          Forced — a variable was set by hand, so this run is steered, not earned.
        </p>
      )}
      {!live && (
        <p className="var-hint">Start play to read live values and set them.</p>
      )}
      {props.variables.map((v) => {
        const active = props.selected === v.name;
        const value = live ? live[v.name] : undefined;
        const steppable = Boolean(live && onSet && declKind(v.declaration) !== "string");
        return (
          <div key={v.name} className={`var-block${active ? " active" : ""}`}>
            <button
              className={`var-row${active ? " active" : ""}`}
              aria-pressed={active}
              onClick={() => props.onSelect(active ? null : v.name)}
            >
              <span className="var-name">{v.name}</span>
              <span className="var-decl">{v.declaration}</span>
              {live && (
                <span className="var-value" data-testid={`value-${v.name}`}>
                  = {showValue(value)}
                </span>
              )}
              <span className="var-io">
                readers: {v.readers.length ? v.readers.join(", ") : "—"}
                <br />
                writers: {v.writers.length ? v.writers.join(", ") : "—"}
              </span>
            </button>
            {steppable && (
              <div className="var-stepper" role="group" aria-label={`step ${v.name}`}>
                <button
                  type="button"
                  onClick={() => {
                    const next = stepValue(v, value, -1);
                    if (next !== null) onSet!(v.name, next);
                  }}
                  aria-label={`decrease ${v.name}`}
                  title={`decrease ${v.name}`}
                >
                  −
                </button>
                <span className="var-stepper-value">{showValue(value)}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = stepValue(v, value, 1);
                    if (next !== null) onSet!(v.name, next);
                  }}
                  aria-label={`increase ${v.name}`}
                  title={`increase ${v.name}`}
                >
                  +
                </button>
              </div>
            )}
            {live && onSet && (
              <form
                className="var-set"
                onSubmit={(e) => {
                  e.preventDefault();
                  const next = draft[v.name];
                  if (next === undefined || next === "") return;
                  onSet(v.name, next);
                  setDraft((d) => ({ ...d, [v.name]: "" }));
                }}
              >
                <label>
                  <span className="visually-hidden">Set {v.name}</span>
                  <input
                    type="text"
                    value={draft[v.name] ?? ""}
                    placeholder="set…"
                    aria-label={`Set ${v.name}`}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [v.name]: e.target.value }))
                    }
                  />
                </label>
                <button type="submit">Set</button>
              </form>
            )}
          </div>
        );
      })}
    </section>
  );
}
