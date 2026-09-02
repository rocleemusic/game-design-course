import {
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, Flag, Pencil } from "lucide-react";
import type { NodeKind, PlayState, ReviewStatus } from "../../types";

/**
 * The dialogue-canvas node card, organised like an Unreal Blueprint node.
 *
 *   ┌──── 3px kind bar ───────────────────────┐
 *   │ HEAD   kind · id (mono) · status dot    │  <- lightest band when
 *   ├─────────────────────────────────────────┤     reviewed; solid kind
 *   │ BODY   title, snippet (clamped 3 lines) │     fill while pending (4)
 *   ├─────────────────────────────────────────┤
 *   │ FOOT   chips · note · option pins       │
 *   └──── ●    ●    ●  per-option handles ────┘
 *
 * Four rulings are load-bearing here and must not be undone:
 *
 * 1. No Approve/Flag on the card. They were inside the click target and got
 *    hit while dragging or reading. They live on the hover/focus toolbar the
 *    canvas renders OUTSIDE the card — but the card keeps the keyboard path
 *    (`a` / `f` / `c`), so a hidden toolbar can never make approving
 *    unreachable. test/BlueprintNode.test.tsx pins their absence.
 *
 * 2. The card is OPAQUE (sign-off 6). Every surface here is a solid colour or
 *    a gradient between solid colours. Depth is border + layered shadow + the
 *    head/body step + a top-edge highlight. A translucent card over the night
 *    canvas would keep test/contrast.test.ts green (it parses opaque hex from
 *    tokens.css) while real contrast fell through the 4.5:1 floor.
 *
 * 3. Body text is --ink only. The body sits on the darkest card surface, where
 *    --muted lands at ~4.4:1. Muted micro-labels belong in the head and foot,
 *    which stay on --paper. test/blueprintContrast.test.ts holds that line.
 *
 * 4. The head is only ever solid-filled while PENDING (RULED 2026-08-01, the
 *    card-head review) — the fill IS the "needs review" signal. Approved/
 *    edited/flagged all render the ordinary wash head (--bp-head-bg), so the
 *    head-lighter-than-body rule in note 3's test still holds for every
 *    reviewed state; pending is the one state allowed to break it on purpose.
 *    This is also why kind-line and kind-screen can safely reuse a status
 *    colour for their pending fill (--dusk-deep = "edited", --forest =
 *    "approved"): fill and status colour can never appear on one card at the
 *    same time, so the status dot's icon (Check/Pencil/Flag, same as
 *    NodeCard's medallion) is what disambiguates when it matters, not the
 *    hue. blueprint.css's kind aliases carry each kind's --bp-pending-fill /
 *    --bp-pending-text pair; test/blueprintContrast.test.ts pins both this
 *    and every other kind NOT accidentally colliding the same way.
 *
 * The snippet clamp is the CSS one that already exists (`.card-text`,
 * -webkit-line-clamp: 3). Never a JS height guess — the canvas MEASURES cards
 * (React Flow `measured` + useNodesInitialized) and lays out from the truth.
 */

export type BlueprintStatus = ReviewStatus | "pending";

/** One option pin under a choice card, paired 1:1 with a source handle. */
export interface OptionPin {
  /** the option_id — also the Handle id the edge attaches to */
  id: string;
  /** short label under the card ("offer", "leave") */
  label: string;
  status: BlueprintStatus;
}

export interface BlueprintNodeProps {
  id: string;
  kind: NodeKind;
  idLabel?: string;
  /** the speaker, or the option's mode ("spoken" / "deed") */
  title?: string;
  /** display text, already run through textOf() so saved edits show */
  text?: string;
  /** presence makes the text editable in place; target for edits.json */
  editTarget?: string;
  bracketed?: boolean;
  status: BlueprintStatus;
  /** the note left with a flag — rendered, not just written (bug 1) */
  note?: string;
  /**
   * The option's player_line was edited. Shown ALONGSIDE `status`, never folded
   * into it: the option's own review and its line's edit are separate facts.
   */
  lineEdited?: boolean;
  playState?: PlayState;
  sweepDim?: boolean;
  varHit?: boolean;
  /** the beat opens only under availability_conditions — draw it gated */
  gated?: boolean;
  chips?: string[];
  /** choice cards only: one pin (and one handle) per option */
  pins?: OptionPin[];
  tooltip?: ReactNode;
  onApprove?: (id: string) => void;
  onFlag?: (id: string) => void;
  onClearStatus?: (id: string) => void;
  onSaveEdit?: (target: string, oldText: string, newText: string) => void;
  /** enter opens: drill into a screen or scene */
  onOpen?: () => void;
  /** play mode: jump the story here */
  onJump?: () => void;
}

/**
 * Cursor to the END of the existing text on mount (edits here are touch-ups,
 * not rewrites). Module-level so the ref identity is stable — an inline ref
 * re-runs every render and would yank the cursor on each keystroke.
 */
function cursorToEnd(el: HTMLTextAreaElement | null) {
  if (el) el.setSelectionRange(el.value.length, el.value.length);
}

const isTextField = (el: EventTarget | null) => {
  const tag = el instanceof HTMLElement ? el.tagName : "";
  return tag === "TEXTAREA" || tag === "INPUT";
};

/**
 * The status dot's icon, once reviewed — same glyphs NodeCard's medallion
 * already uses (approved/edited/flagged), not new ones. Pending stays a
 * plain dashed ring (null here): "one glance, no word to read" still holds
 * there, and it's the one status the pending fill itself already announces.
 */
function dotIcon(status: BlueprintStatus) {
  if (status === "approved") return Check;
  if (status === "edited") return Pencil;
  if (status === "flagged") return Flag;
  return null;
}

/**
 * Where a pin (and its handle) sits along the card's bottom edge: option i of
 * N gets the centre of its own 1/N slice, so the fan-out reads as one edge per
 * option instead of N edges leaving the same point.
 */
export function pinOffset(i: number, n: number): string {
  return `${((i + 0.5) / Math.max(n, 1)) * 100}%`;
}

export function BlueprintNode(props: BlueprintNodeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    if (!props.editTarget || props.onSaveEdit === undefined) return;
    setDraft(props.text ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    if (props.editTarget && props.onSaveEdit && draft !== props.text) {
      props.onSaveEdit(props.editTarget, props.text ?? "", draft);
    }
    setEditing(false);
  };

  /**
   * The keyboard path the ruling requires. It stands in for the toolbar, so it
   * covers the same verbs: approve, flag, clear, edit, jump, open.
   */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing || isTextField(e.target)) return; // inside an edit, every key is text
    if (e.key === "a" && props.onApprove) {
      e.preventDefault();
      e.stopPropagation();
      props.onApprove(props.id);
    } else if (e.key === "f" && props.onFlag) {
      e.preventDefault();
      e.stopPropagation();
      props.onFlag(props.id);
    } else if (e.key === "c" && props.onClearStatus && props.status !== "pending") {
      e.preventDefault();
      e.stopPropagation();
      props.onClearStatus(props.id);
    } else if (e.key === "e" && props.editTarget) {
      e.preventDefault();
      e.stopPropagation();
      startEdit();
    } else if (e.key === "j" && props.onJump) {
      e.preventDefault();
      e.stopPropagation();
      props.onJump();
    } else if (e.key === "Enter") {
      if (e.target instanceof HTMLElement && e.target.tagName === "BUTTON") return;
      e.preventDefault();
      e.stopPropagation();
      if (props.onOpen) props.onOpen();
      else startEdit();
    }
  };

  const classes = [
    "bp-node",
    `kind-${props.kind}`,
    `status-${props.status}`,
    props.playState ? `play-${props.playState}` : "",
    props.sweepDim ? "sweep-dim" : "",
    props.varHit ? "var-hit" : "",
    props.gated ? "gated" : "",
    editing ? "editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const displayText =
    props.bracketed && props.text !== undefined ? `[${props.text}]` : props.text;

  const pins = props.pins ?? [];
  const hasFoot =
    (props.chips && props.chips.length > 0) ||
    (!editing && props.note !== undefined && props.note !== "") ||
    pins.length > 0;
  const DotIcon = dotIcon(props.status);

  return (
    <div
      className={classes}
      tabIndex={0}
      role="group"
      aria-label={`${props.kind} ${props.id}, ${props.status}`}
      aria-keyshortcuts="a f c e Enter"
      data-artifact-id={props.id}
      // Card width scales with the option count so the pins stay separately
      // readable. A CSS var, not a pixel width, so the measured relayout still
      // reads the truth off the DOM rather than a number computed here.
      style={pins.length > 0 ? ({ "--bp-pins": pins.length } as CSSProperties) : undefined}
      onKeyDown={onKeyDown}
      onDoubleClick={props.onOpen}
      title={
        props.onApprove
          ? "a approves · f flags · c clears · e edits"
          : undefined
      }
    >
      {/* HEAD — the kind band. Lightest surface on the card when reviewed, so
          the body sits a clear step darker underneath it (the Blueprint
          read) — solid-filled instead while pending (see file header, note 4). */}
      <div className="bp-head">
        <span className="bp-kind">{props.kind}</span>
        <span className="bp-id">{props.idLabel ?? props.id}</span>
        {/* Two facts, two marks: the option's own review, and whether the
            player_line under it was edited. One badge could only tell you
            about the first. */}
        {props.lineEdited && (
          <span className="line-edited-badge" title="this option's line was edited">
            line edited
          </span>
        )}
        <span
          className="bp-dot"
          role="img"
          aria-label={`status ${props.status}`}
          title={props.status}
        >
          {DotIcon && <DotIcon strokeWidth={2.5} aria-hidden="true" />}
        </span>
      </div>

      {/* BODY — darker than the head. --ink text only (see note 3 above). */}
      <div className="bp-body">
        {props.title && <div className="bp-title">{props.title}</div>}

        {editing ? (
          <>
            <textarea
              className="edit-area nodrag nowheel"
              value={draft}
              autoFocus
              ref={cursorToEnd}
              aria-label={`edit ${props.editTarget}`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setEditing(false);
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit();
              }}
            />
            <div className="card-actions">
              <button className="pill-primary" onClick={saveEdit}>
                Save
              </button>
              <button className="pill-quiet" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          displayText !== undefined && (
            <div
              className={`card-text${props.editTarget ? " editable" : ""}`}
              onClick={props.editTarget ? startEdit : undefined}
              // Clamped to three lines, so the full text has to stay reachable
              // without opening the editor.
              title={
                props.editTarget
                  ? `Click to edit in place\n\n${displayText}`
                  : displayText
              }
            >
              {displayText}
            </div>
          )
        )}
      </div>

      {hasFoot && (
        <div className="bp-foot">
          {props.chips && props.chips.length > 0 && (
            <div className="chip-row">
              {props.chips.map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className={`chip${c.startsWith("gate: ") ? " chip-gate" : ""}`}
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Bug 1: the note was written to approvals.json and rendered
              nowhere, so a flag note could be left and never read back. */}
          {!editing && props.note && (
            <p className="card-note" title={`note on ${props.id}`}>
              {props.note}
            </p>
          )}

          {/* One pin per option, sitting exactly over its own edge handle, so
              you can read which branch leaves where without tracing a line. */}
          {pins.length > 0 && (
            <div className="bp-pins" aria-hidden="true">
              {pins.map((p, i) => (
                <span
                  key={p.id}
                  className={`bp-pin status-${p.status}`}
                  style={{ left: pinOffset(i, pins.length) }}
                  title={`${p.id} — ${p.status}`}
                >
                  {p.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {props.tooltip}
    </div>
  );
}
