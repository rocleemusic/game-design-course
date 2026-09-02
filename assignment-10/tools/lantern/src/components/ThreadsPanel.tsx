import { useMemo } from "react";
import type { Graph } from "../types";
import type { PlayView } from "../lib/play";
import { buildWeek } from "../lib/week";
import { threadProse } from "../lib/threadProse";

/**
 * Active threads (D4) — the live half of thread tracking.
 *
 * GP-53 (RULED 2026-08-02): this lives in the LEFT PANE (the navigator),
 * not a tab. It collapses exactly like the scene-rail's screen groups —
 * same twisty control, same aria-expanded/aria-controls wiring, same
 * "container stays, rows go" hidden pattern — because it sits directly
 * under them and must read as one system.
 *
 * `WorldState.threadMoves()` / `movedThreads()` / `eventLog()` had zero call
 * sites outside world.ts before this: the host recorded every
 * `recordThreadMove` external call, and nothing ever read it back. The only
 * existing thread UI (WeekView) is static scraping of authored
 * `state_actions` — which scenes CAN move a thread, never which HAVE, this
 * session.
 *
 * GP-96: thread ids read as their open question via `lib/threadProse`'s
 * id -> prose map, generated at build from the per-soul thread registries
 * (`cast/[soul]-[role]-threads.md`). An id absent from the map (drift no
 * registry authorises) falls back to the raw id rather than a blank — see
 * `threadProse`'s doc comment. week.ts's cross-reference (which OTHER scenes
 * are authored to move the same thread) is kept alongside it.
 */
export function ThreadsPanel(props: {
  graph: Graph;
  playView: PlayView | null;
  /** collapsed exactly like a rail screen group — open is the default */
  open: boolean;
  onToggle: () => void;
}) {
  const week = useMemo(() => buildWeek(props.graph), [props.graph]);
  const threadScenes = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of week.threads) m.set(t.thread_id, t.scenes);
    return m;
  }, [week]);

  const { open } = props;
  const listId = "rail-threads";

  const body = !props.playView ? (
    <p className="notes-hint">
      Start playing (a Stage or Play pane) to record thread moves — this
      panel reads the running session's own event log, not authored data.
    </p>
  ) : (
    <ThreadsBody playView={props.playView} threadScenes={threadScenes} />
  );

  return (
    <section className="scene-rail threads-rail" aria-label="active threads">
      <div className="rail-group">
        <div className="rail-screen-row">
          {/* the twisty is its own control, matching the scene rail's groups */}
          <button
            className="rail-twisty"
            onClick={props.onToggle}
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`${open ? "Collapse" : "Expand"} active threads`}
          >
            {open ? "▾" : "▸"}
          </button>
          <div className="rail-head">Threads</div>
        </div>
        {/* the container stays so aria-controls always resolves; the rows
            themselves go, so a collapsed group is genuinely out of the way */}
        <div id={listId} hidden={!open}>
          {open && body}
        </div>
      </div>
    </section>
  );
}

function ThreadsBody(props: {
  playView: PlayView;
  threadScenes: Map<string, string[]>;
}) {
  const { threadMoves, threadMoveLog } = props.playView;
  const ids = Object.keys(threadMoves);

  return (
    <>
      <p className="header-note">
        {ids.length} thread{ids.length === 1 ? "" : "s"} moved this session
      </p>
      {ids.length === 0 ? (
        <p className="notes-hint">No thread has moved yet this session.</p>
      ) : (
        <ul className="notes-list">
          {ids.map((id) => {
            const scenes = props.threadScenes.get(id) ?? [];
            return (
              <li key={id} className="notes-item">
                <span className="week-thread-chip">{id}</span>
                <p className="notes-item-body">
                  {threadProse(id)}
                  <br />
                  moved {threadMoves[id]}x this session
                  {scenes.length > 0 && (
                    <>
                      {" "}
                      · authored to move via: {scenes.join(", ")}
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="week-threads-head">Move log</h3>
      {threadMoveLog.length === 0 ? (
        <p className="notes-hint">no thread-move events recorded yet</p>
      ) : (
        <ol className="notes-list">
          {threadMoveLog.map((id, i) => (
            <li key={`${id}-${i}`} className="notes-item">
              {i + 1}. <span className="week-thread-chip">{id}</span>
              {" — "}
              {threadProse(id)}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
