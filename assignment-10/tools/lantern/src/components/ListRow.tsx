import type { ReactNode } from "react";

/**
 * One row. The list/rail counterpart to the canvas node card.
 *
 * Why this exists: NodeCard was doing two jobs at once — a 260px canvas card
 * AND every narrow row in the rail, the sweep list and the pickers. Those want
 * opposite things (a card wants a header bar, a snippet and handles; a row
 * wants one line that ellipsises), so the card grew to 244 lines carrying
 * branches only the other job used. Rows live here now, and the card is free
 * to be a card.
 *
 * The grammar is the existing `.sweep-item` one, unchanged, so every current
 * rail/sweep style and test keeps working:
 *
 *   [kind]  label…………………………  [status]
 *
 * `kind` and `status` are mono micro-labels; `label` takes the slack and
 * truncates. Nothing here is a review control — approving is the card's and
 * the toolbar's job, never a row's, so a row can't be approved by accident
 * while you are just navigating.
 */
export interface ListRowProps {
  /** leading mono tag: "scene", "option", the artifact kind */
  kind: string;
  /** the row's name — takes the remaining width and ellipsises */
  label: ReactNode;
  /** trailing mono tag, usually the review status */
  status?: ReactNode;
  /** the row the view is currently showing */
  active?: boolean;
  /** extra class for the row's context (`rail-scene`, …) */
  className?: string;
  title?: string;
  onClick?: () => void;
}

export function ListRow(props: ListRowProps) {
  const cls = [
    "sweep-item",
    props.className ?? "",
    props.active ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      onClick={props.onClick}
      title={props.title}
      aria-current={props.active ? "true" : undefined}
    >
      <span className="card-id">{props.kind}</span>
      <span className="sweep-label">{props.label}</span>
      {props.status !== undefined && (
        <span className="card-id">{props.status}</span>
      )}
    </button>
  );
}
