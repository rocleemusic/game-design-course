import type { ReactNode } from "react";
import { VIEWS, type ViewId } from "../lib/views";

/**
 * A pane that can show any view.
 *
 * Every host lists the full set of views and tracks its own selection, so the
 * centre and the right pane are independent: put Dialogue beside Level, or
 * Stage beside Play, without either strip speaking for the other. Nothing here
 * knows what a view *is* — the caller renders the body.
 *
 * The body is a flex column that grows. That is load-bearing: a `.pane` inside
 * a flex column with nothing to grow into collapses to zero height, which is
 * what made the dialogue graph invisible.
 */
export interface ViewHostProps {
  /** dom id, so a Splitter can name this host in aria-controls */
  id: string;
  /** accessible name, e.g. "centre pane" */
  label: string;
  view: ViewId;
  onSelect: (view: ViewId) => void;
  /** present only on a hideable host — the right pane */
  onHide?: () => void;
  children: ReactNode;
}

export function ViewHost(props: ViewHostProps) {
  return (
    <section className="view-host" id={props.id} aria-label={props.label}>
      <div className="view-tabs" role="tablist" aria-label={`${props.label} views`}>
        {VIEWS.map((v) => {
          const active = v.id === props.view;
          return (
            <button
              key={v.id}
              role="tab"
              aria-selected={active}
              title={v.hint}
              className={`view-tab${active ? " view-tab-active" : ""}`}
              onClick={() => props.onSelect(v.id)}
            >
              {v.label}
            </button>
          );
        })}
        {props.onHide && (
          <button
            className="pill-quiet view-hide"
            onClick={props.onHide}
            aria-label={`Hide the ${props.label}`}
            title="Hide this pane"
          >
            ✕
          </button>
        )}
      </div>
      <div className="view-body">{props.children}</div>
    </section>
  );
}
