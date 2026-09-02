import { useEffect, useMemo, useRef, useState } from "react";
import { notesAsMarkdown, type Note, type NoteKind } from "../lib/bridge";

/**
 * Notes (L7) — the channel Roc's authoring loop runs on.
 *
 * His described loop is shape-first: approve the arc, approve a conversation
 * shape, then SAY WHAT EACH BEAT MUST DO and have the pipeline fill it. That
 * third step needs somewhere to put "not enough branches here" so it reaches
 * Claude, and it is emphatically not an approval — folding a change request
 * into approvals.json would make a request look like a verdict.
 *
 * Hence a separate file, three kinds, and an export in a form Claude can act
 * on directly.
 *
 * D4 — target used to be hardcoded to the app's global `sceneId ?? screenId`
 * selection: a line/choice/option/gather could never be a target, a scene
 * selection permanently shadowed its own screen, and there was no way to
 * write a note about nothing in particular. The target field below is a free
 * text input instead: it DEFAULTS to the current selection (so nothing about
 * the common case gets harder) but is fully editable — type any artifact id
 * (every card already shows its own id) to target it, or clear the field for
 * a general note. `selected` only steers the default; it never blocks a note.
 */

const KINDS: { id: NoteKind; label: string; hint: string }[] = [
  { id: "structure", label: "Structure", hint: "this beat needs to do X — goes to the pipeline" },
  { id: "question", label: "Question", hint: "something to resolve before the prose pass" },
  { id: "todo", label: "Todo", hint: "a job to come back to" },
];

export interface NotesPanelProps {
  notes: Note[];
  /** the currently selected node, if any — seeds the target field's default */
  target: string | null;
  onAdd: (note: { target: string | null; kind: NoteKind; body: string }) => void;
  /** D4: resolved existed on Note with no writer anywhere — this is it */
  onResolve?: (note: Note, resolved: boolean) => void;
}

export function NotesPanel(props: NotesPanelProps) {
  const [kind, setKind] = useState<NoteKind>("structure");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  // The target field auto-follows the app's selection UNTIL the user types in
  // it by hand — after that, a selection change elsewhere in the tool must
  // not silently steal what they were about to note (a scene picked to
  // *read* while writing a note about a line is a normal thing to do).
  const [targetInput, setTargetInput] = useState(props.target ?? "");
  const touchedRef = useRef(false);
  useEffect(() => {
    if (!touchedRef.current) setTargetInput(props.target ?? "");
  }, [props.target]);

  const markdown = useMemo(() => notesAsMarkdown(props.notes), [props.notes]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be denied; the textarea below is the fallback, so this
      // is not worth an error state.
    }
  };

  const useSelection = () => {
    touchedRef.current = false;
    setTargetInput(props.target ?? "");
  };

  return (
    <section className="panel notes-panel" aria-label="notes">
      <h2>Notes</h2>

      <form
        className="notes-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim() === "") return;
          const trimmedTarget = targetInput.trim();
          props.onAdd({ target: trimmedTarget === "" ? null : trimmedTarget, kind, body: body.trim() });
          setBody("");
        }}
      >
        <label>
          <span className="visually-hidden">Note target — blank for a general note</span>
          <input
            type="text"
            className="notes-target-input"
            value={targetInput}
            onChange={(e) => {
              touchedRef.current = true;
              setTargetInput(e.target.value);
            }}
            placeholder="(no target — general note)"
            aria-label="note target, blank for a general note"
          />
        </label>
        <p className="notes-target-hint">
          {targetInput.trim() === "" ? (
            "general note — not addressed to any node"
          ) : (
            <>
              on <code>{targetInput.trim()}</code>
            </>
          )}
          {props.target && props.target !== targetInput && (
            <button type="button" className="pill-ghost notes-use-selection" onClick={useSelection}>
              Use selection ({props.target})
            </button>
          )}
        </p>
        <label>
          <span className="visually-hidden">Note kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <p className="notes-kind-hint">{KINDS.find((k) => k.id === kind)?.hint}</p>
        <label>
          <span className="visually-hidden">Note</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="not enough branches here…"
            rows={3}
          />
        </label>
        <button type="submit" className="pill-primary">
          Add note
        </button>
      </form>

      <div className="notes-head">
        <h3>
          {props.notes.length} note{props.notes.length === 1 ? "" : "s"}
        </h3>
        {props.notes.length > 0 && (
          <button type="button" className="pill-ghost" onClick={copy}>
            {copied ? "Copied" : "Copy as markdown"}
          </button>
        )}
      </div>

      {props.notes.length === 0 ? (
        <p className="notes-hint">No notes yet.</p>
      ) : (
        <ul className="notes-list">
          {props.notes.map((n, i) => (
            <li
              key={`${n.target ?? "general"}-${n.timestamp}-${i}`}
              className={`notes-item${n.resolved ? " notes-item-resolved" : ""}`}
            >
              <span className={`notes-kind notes-kind-${n.kind}`}>{n.kind}</span>
              <code className="notes-item-target">{n.target ?? "(general)"}</code>
              <p className="notes-item-body">{n.body}</p>
              {props.onResolve && (
                <div className="card-actions">
                  <button
                    type="button"
                    className="pill-quiet"
                    onClick={() => props.onResolve!(n, !n.resolved)}
                    aria-label={
                      n.resolved
                        ? `reopen note on ${n.target ?? "general"}`
                        : `mark note on ${n.target ?? "general"} resolved`
                    }
                  >
                    {n.resolved ? "Reopen" : "Mark resolved"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
