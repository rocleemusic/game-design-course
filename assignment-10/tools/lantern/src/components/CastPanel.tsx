import type { Graph, Soul } from "../types";
import type { PersonaCard } from "../lib/personaCard";
import { soulThreads, SOUL_ARC_SPINES } from "../lib/personaCard";
import type { PlayView } from "../lib/play";
import type { BondBand } from "../lib/world";
import { soulName, soulNames } from "../lib/souls";

const BAND_LABEL: Record<BondBand, string> = { 0: "low", 1: "mid", 2: "high" };

/** Per-soul key in the persisted collapsed list. Soul ids are lowercase names
 *  and screen ids are SCR-*, so the prefix can never collide with either the
 *  rail groups or the threads sentinel. */
export function castRailKey(soulId: string): string {
  return `__cast__${soulId}`;
}

/**
 * Cast tab (D5) — one card per soul, four layers stacked:
 *
 *   1. Graph data      — soul_id/name/depth/role_tag/home_screen, straight
 *                         off graph.json.
 *   2. Persona card     — the authored card (personas.json), or a clearly
 *                         marked placeholder when none exists yet.
 *   3. Live play state  — the derived bond BAND only (0/1/2). Never the raw
 *                         count: persona-card-schema.md:31-35 and
 *                         world.ts:15-25 are explicit that the bond score
 *                         "accretes host-side, never on the card, never
 *                         surfaced." PlayView.bondBands is the only bond
 *                         value this panel ever reads.
 *   4. Arc progress     — the Soul Arc Spine (a human note, explicitly NOT a
 *                         card field per the schema) plus which of the
 *                         soul's own authored threads have moved THIS
 *                         session, live off world state. No fabricated
 *                         progress scalar — D7's guardrail forbids exactly
 *                         that ("a tier readout that sums dialogue picks is
 *                         the niceness-meter failure the schema forbids"),
 *                         and nothing here sums anything.
 */
export function CastPanel(props: {
  graph: Graph;
  personas: Record<string, PersonaCard>;
  playView: PlayView | null;
  /** persisted collapsed list (same store as the rail groups / threads) */
  collapsed: ReadonlySet<string>;
  onToggleCollapsed: (key: string) => void;
}) {
  const souls = props.graph.souls ?? [];
  const names = soulNames(props.graph);

  return (
    <section className="panel cast-panel" aria-label="cast">
      <h2>Cast</h2>
      <p className="header-note">
        {souls.length} soul{souls.length === 1 ? "" : "s"} — persona card, live
        bond band, and arc progress
      </p>
      {souls.length === 0 ? (
        <p className="notes-hint">No souls in this graph.</p>
      ) : (
        <ul className="notes-list">
          {souls.map((soul) => (
            <SoulCard
              key={soul.soul_id}
              soul={soul}
              name={soulName(names, soul.soul_id)}
              card={props.personas[soul.soul_id]}
              graph={props.graph}
              playView={props.playView}
              open={!props.collapsed.has(castRailKey(soul.soul_id))}
              onToggle={() => props.onToggleCollapsed(castRailKey(soul.soul_id))}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SoulCard(props: {
  soul: Soul;
  name: string;
  card: PersonaCard | undefined;
  graph: Graph;
  playView: PlayView | null;
  open: boolean;
  onToggle: () => void;
}) {
  const { soul, card, playView, open } = props;
  const bodyId = `cast-card-${soul.soul_id}`;
  const band = playView?.bondBands[soul.soul_id];
  const threads = soulThreads(props.graph, soul.soul_id);
  const arcNote = SOUL_ARC_SPINES[soul.soul_id];

  const essenceRows: [string, string | undefined][] = card
    ? [
        ["Primal seed", card.essence.primal_seed],
        ["Wants / behavior", card.essence.essence_descriptor],
        ["Deflects to", card.essence.trait_axes?.deflection_target],
        ["Precision", card.essence.trait_axes?.precision_profile],
        ["Warmth channel", card.essence.trait_axes?.warmth_channel],
        ["Voice", card.essence.voice_register],
        ["Conviction", card.essence.conviction],
        ["Backstory seed", card.essence.backstory_guideline],
        ["Notices / wants", card.essence.notice_and_want],
      ]
    : [];
  const roleRows: [string, string | undefined][] = card
    ? [
        ["Role", card.role.role_tag],
        ["Age band", card.role.age_band],
      ]
    : [];

  return (
    <li className="notes-item cast-card">
      {/* the name row is the toggle — same twisty pattern as the rail groups */}
      <div className="rail-screen-row">
        <button
          className="rail-twisty"
          onClick={props.onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={`${open ? "Collapse" : "Expand"} ${props.name || soul.soul_id} card`}
        >
          {open ? "▾" : "▸"}
        </button>
        <h3>{props.name || soul.soul_id}</h3>
      </div>

      {/* 1 — graph data: stays visible collapsed, so a folded card is still
          recognisable (id · depth · role · home) */}
      <p className="notes-item-body">
        <strong>Graph:</strong> <code>{soul.soul_id}</code>
        {soul.deep !== undefined && <> · depth {soul.deep ? "deep" : "texture"}</>}
        {soul.role_tag && <> · role {soul.role_tag}</>}
        {soul.home_screen && <> · home {soul.home_screen}</>}
      </p>

      {/* the container stays so aria-controls always resolves; the body goes,
          so a collapsed card is genuinely out of the way */}
      <div id={bodyId} hidden={!open}>
      {open && (<>
      {/* 2 — authored persona card */}
      {!card ? (
        <p className="notes-hint">
          No persona card authored for this soul (no entry in
          personas.json).
        </p>
      ) : (
        <div className="notes-item-body">
          <p>
            <strong>
              Persona card{card.authored ? "" : " — PLACEHOLDER, not authored"}
            </strong>
          </p>
          {card.note && <p className="notes-hint">{card.note}</p>}
          <table className="cast-kv">
            <tbody>
              {[...essenceRows, ...roleRows]
                .filter(([, v]) => v)
                .map(([label, v]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              {card.authored_exceptions && (
                <tr>
                  <th scope="row">Exception</th>
                  <td>{card.authored_exceptions}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3 — live play state: the coarse band only, never the raw count */}
      <p className="notes-item-body">
        <strong>Live bond:</strong>{" "}
        {playView === null
          ? "not playing — open a Stage or Play pane to see a band"
          : `band ${band ?? 0} (${BAND_LABEL[band ?? 0]})${
              band === undefined ? " — unscored this session" : ""
            }`}
      </p>

      {/* 4 — arc progress: the human arc-spine note + live thread moves */}
      <div className="notes-item-body">
        <strong>Arc:</strong>{" "}
        {arcNote ?? "no authored arc spine for this soul yet (arc-festival-slice.md gap)"}
        {threads.length > 0 && (
          <ul className="notes-list">
            {threads.map((t) => (
              <li key={t} className="notes-item">
                <span className="week-thread-chip">{t}</span>{" "}
                {playView
                  ? `moved ${playView.threadMoves[t] ?? 0}x this session`
                  : "not playing"}
              </li>
            ))}
          </ul>
        )}
      </div>
      </>)}
      </div>
    </li>
  );
}
