import { useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Check,
  Circle,
  CircleDashed,
  Eye,
  Flag,
  Flame,
  Flower,
  Pencil,
} from "lucide-react";
import type { NodeKind, PlayState, ReviewStatus } from "../types";

export interface NodeCardProps {
  id: string;
  kind: NodeKind;
  idLabel?: string;
  title?: string;
  /** display text, already run through textOf() so saved edits show */
  text?: string;
  /** presence makes the text editable in place; target for edits.json */
  editTarget?: string;
  bracketed?: boolean;
  status: ReviewStatus | "pending";
  /** the note left with a flag — rendered on the card, not just written (bug 1) */
  note?: string;
  /**
   * The option's player_line has been edited. Shown ALONGSIDE `status`, never
   * folded into it: the option's own review and its line's edit are separate
   * facts, and one badge could only ever tell you about the first.
   */
  lineEdited?: boolean;
  playState?: PlayState;
  sweepDim?: boolean;
  varHit?: boolean;
  /** the node's beat opens only under availability_conditions — draw it gated */
  gated?: boolean;
  chips?: string[];
  badges?: ReactNode;
  tooltip?: ReactNode;
  onApprove?: (id: string) => void;
  onFlag?: (id: string) => void;
  /** back to unreviewed; shown only once the card carries a status (bug 3) */
  onClearStatus?: (id: string) => void;
  /**
   * Drop the on-card review BUTTONS while keeping the handlers, so the keyboard
   * path (a / f / c) still works.
   *
   * L5 ruled review actions off the card because they were being hit by
   * accident, and BlueprintNode honours that on the dialogue canvas. The
   * scene-picker strip still uses this card, so without this flag the same view
   * showed two contradictory review grammars and the accident was only half
   * retired. Keeping the handlers is the other half of the ruling: a hidden
   * control must never make approving unreachable.
   */
  hideActions?: boolean;
  onSaveEdit?: (target: string, oldText: string, newText: string) => void;
  /** enter opens: drill into a screen or scene */
  onOpen?: () => void;
  /** play mode: jump the story here (spec: click any node to jump) */
  onJump?: () => void;
}

/**
 * The one node card. Used inside both React Flow canvases and the plain
 * scene list / sweep list. Keyboard floor:
 *   - card is a tab stop (reading order = render order)
 *   - Enter opens (drill in), or starts the edit on editable leaf nodes
 *   - `a` approves — only while the card has focus and no text field is open
 *   - inside an edit, every key is text; Esc cancels, Ctrl+Enter saves
 */
/**
 * On mount, put the cursor at the END of the existing text (chosen over
 * select-all: edits here are usually touch-ups, not rewrites). Module-level
 * so the ref identity is stable — an inline ref re-runs every render and
 * would yank the cursor to the end on each keystroke.
 */
function cursorToEnd(el: HTMLTextAreaElement | null) {
  if (el) el.setSelectionRange(el.value.length, el.value.length);
}

/**
 * The medallion icon — one per card, mirroring design/tokens.html:
 * review marks (flag/pencil/check) outrank play position (flame/eye/circle);
 * scene cards are soul markers (flower); everything else is pending (dashed).
 * Must stay in step with the medallion CSS cascade in app.css.
 */
function medallionIcon(
  status: ReviewStatus | "pending",
  playState: PlayState | undefined,
  kind: NodeKind
) {
  if (status === "flagged") return Flag;
  if (status === "edited") return Pencil;
  if (status === "approved") return Check;
  if (playState === "current") return Flame;
  if (playState === "visited") return Eye;
  if (playState === "dim") return Circle;
  if (kind === "scene") return Flower;
  return CircleDashed;
}

export function NodeCard(props: NodeCardProps) {
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

  const isTextField = (el: EventTarget | null) => {
    const tag = el instanceof HTMLElement ? el.tagName : "";
    return tag === "TEXTAREA" || tag === "INPUT";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing || isTextField(e.target)) return; // inside an edit, every key is text
    if (e.key === "a") {
      e.preventDefault();
      e.stopPropagation();
      props.onApprove?.(props.id);
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
    "node-card",
    `kind-${props.kind}`,
    `status-${props.status}`,
    props.playState ? `play-${props.playState}` : "",
    props.sweepDim ? "sweep-dim" : "",
    props.varHit ? "var-hit" : "",
    props.gated ? "gated" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const displayText =
    props.bracketed && props.text !== undefined ? `[${props.text}]` : props.text;

  const MedIcon = medallionIcon(props.status, props.playState, props.kind);

  return (
    <div
      className={classes}
      tabIndex={0}
      role="group"
      aria-label={`${props.kind} ${props.id}, ${props.status}`}
      data-artifact-id={props.id}
      onKeyDown={onKeyDown}
      onDoubleClick={props.onOpen}
    >
      <span className="med" aria-hidden="true">
        <MedIcon strokeWidth={2} />
      </span>
      <div className="card-head">
        <span className="card-kind">{props.kind}</span>
        <span className="card-id">{props.idLabel ?? props.id}</span>
        <span className="status-badge">{props.status}</span>
        {/* Two different facts, two different marks. A spoken option's card
            shows the option's own review status, but the TEXT on it belongs to
            a player_line with no card of its own. Folding both into one badge
            meant approving the option and then editing its line showed
            "approved" and hid the edit entirely. */}
        {props.lineEdited && (
          <span className="line-edited-badge" title="this option's line was edited">
            line edited
          </span>
        )}
      </div>

      {props.title && <div className="card-title">{props.title}</div>}
      {props.badges}

      {editing ? (
        <div>
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
        </div>
      ) : (
        displayText !== undefined && (
          <div
            className={`card-text${props.editTarget ? " editable" : ""}`}
            onClick={props.editTarget ? startEdit : undefined}
            // The card clamps to three lines, so the full text has to stay
            // reachable without opening the editor.
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

      {props.chips && props.chips.length > 0 && (
        <div className="chip-row">
          {props.chips.map((c, i) => (
            <span key={`${c}-${i}`} className={`chip${c.startsWith("gate: ") ? " chip-gate" : ""}`}>
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Bug 1: the note was written to approvals.json and never rendered, so
          Roc could leave a flag note and never read it back. */}
      {!editing && props.note && (
        <p className="card-note" title={`note on ${props.id}`}>
          {props.note}
        </p>
      )}

      {/*
       * D4: Jump used to live INSIDE the `!hideActions` block, so the scene
       * picker card — which sets hideActions to keep Approve/Flag off the
       * card per L5's ruling — lost Jump too, even though it carries its own
       * onJump prop. Jump is not a review action (it does not touch
       * approvals.json), so it is not gated by hideActions: it renders
       * whenever a caller passes onJump, on every card, review buttons or not.
       */}
      {!editing && props.onJump && (
        <div className="card-actions card-actions-jump">
          <button
            className="pill-ghost"
            onClick={props.onJump}
            aria-label={`jump to ${props.id}`}
          >
            Jump
          </button>
        </div>
      )}

      {!editing && props.onApprove && !props.hideActions && (
        <div className="card-actions">
          <button
            className="pill-primary"
            onClick={() => props.onApprove!(props.id)}
            aria-label={`approve ${props.id}`}
          >
            Approve
          </button>
          <button
            className="pill-flag"
            onClick={() => props.onFlag?.(props.id)}
            aria-label={`flag ${props.id}`}
          >
            Flag
          </button>
          {/* Nothing could return a card to unreviewed before this (bug 3). */}
          {props.status !== "pending" && props.onClearStatus && (
            <button
              className="pill-quiet"
              onClick={() => props.onClearStatus!(props.id)}
              aria-label={`clear review status of ${props.id}`}
            >
              Clear
            </button>
          )}
          {props.editTarget && (
            <button
              className="pill-quiet"
              onClick={startEdit}
              aria-label={`edit ${props.id}`}
            >
              Edit
            </button>
          )}
        </div>
      )}

      {props.tooltip}
    </div>
  );
}
