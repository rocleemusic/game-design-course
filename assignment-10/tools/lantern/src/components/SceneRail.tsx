import type { Graph } from "../types";
import { screensWithScenes } from "../lib/sceneIndex";
import { sceneRailLabel } from "../lib/sceneShortNames";
import { ListRow } from "./ListRow";
import type { ReviewApi } from "./reviewApi";

/**
 * The primary navigator: screens that hold dialogue, each with its scenes
 * beneath it and a scene count. A screen with no scenes never appears, so the
 * rail reads at a glance as "here is where the words are" — the full inventory
 * is the level view's job (its count badge, and its list mode).
 *
 * Rows are ListRow, not the canvas node card — a 252px card with a header bar,
 * a snippet and edge handles is the wrong ergonomics for a narrow rail. Each
 * scene row carries its review status as a trailing word, a seam for a later
 * flag/notes roll-up.
 *
 * GP-96: a scene row reads `SC-T2-11 · toby-the-shelf-C4` — the address plus
 * the thread and conversation it belongs to, so a scene can be tracked back
 * while playing. The short name is derived at build from the line files' H1
 * (`lib/sceneShortNames`); a scene no line file claims keeps its bare address
 * rather than being hidden or given an invented name.
 *
 * Groups start open and collapse one at a time — an escape hatch for a screen
 * with many scenes, not a mode. Collapsing one never touches its neighbours.
 */
export function SceneRail(props: {
  graph: Graph;
  api: ReviewApi;
  activeScreenId: string | null;
  activeSceneId: string | null;
  collapsed: ReadonlySet<string>;
  onToggleCollapsed: (screenId: string) => void;
  onOpenScreen: (screenId: string) => void;
  onOpenScene: (screenId: string, sceneId: string) => void;
}) {
  const rows = screensWithScenes(props.graph);
  return (
    <section className="scene-rail" aria-label="scene presence">
      <div className="rail-head">Scenes</div>
      {rows.length === 0 && (
        <p className="empty-hint">No scenes authored in this run yet.</p>
      )}
      {rows.map((screen) => {
        const screenActive =
          props.activeScreenId === screen.screen_id && props.activeSceneId === null;
        const open = !props.collapsed.has(screen.screen_id);
        const listId = `rail-scenes-${screen.screen_id}`;
        return (
          <div key={screen.screen_id} className="rail-group">
            <div className="rail-screen-row">
              {/* the twisty is its own control: opening a screen and reading
                  its scene list are different intents */}
              <button
                className="rail-twisty"
                onClick={() => props.onToggleCollapsed(screen.screen_id)}
                aria-expanded={open}
                aria-controls={listId}
                aria-label={`${open ? "Collapse" : "Expand"} ${screen.name} scenes`}
              >
                {open ? "▾" : "▸"}
              </button>
              <button
                className={`rail-screen${screenActive ? " active" : ""}`}
                onClick={() => props.onOpenScreen(screen.screen_id)}
                aria-current={screenActive ? "true" : undefined}
              >
                <span className="card-id">{screen.screen_id}</span>
                <span className="rail-name">{screen.name}</span>
                <span className="scene-count">{screen.scene_ids.length}</span>
              </button>
            </div>
            {/* the container stays so aria-controls always resolves; the rows
                themselves go, so a collapsed group is genuinely out of the way */}
            <div id={listId} hidden={!open}>
              {open &&
                screen.scene_ids.map((sid) => {
                  return (
                    <ListRow
                      key={sid}
                      className="rail-scene"
                      kind="scene"
                      label={sceneRailLabel(sid)}
                      status={props.api.statusOf(sid)}
                      active={props.activeSceneId === sid}
                      onClick={() => props.onOpenScene(screen.screen_id, sid)}
                    />
                  );
                })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
