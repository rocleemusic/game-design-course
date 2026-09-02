import type { Health } from "../lib/health";

/**
 * The rail's HEALTH block, mirroring the reference tool: four counts
 * (Reachable / Unreachable / Errors / Warnings), with the errors and warnings
 * spelled out beneath so a fault is readable without leaving the rail. The
 * numbers come from the pure `computeHealth` seam — this only renders them.
 */
export function HealthReadout(props: { health: Health }) {
  const { reachable, unreachable, errors, warnings } = props.health;
  return (
    <section className="health" aria-label="graph health">
      <div className="rail-head">Health</div>
      <dl className="health-grid">
        <dt>Reachable</dt>
        <dd>{reachable.length}</dd>
        <dt>Unreachable</dt>
        <dd className={unreachable.length ? "health-bad" : undefined}>
          {unreachable.length}
        </dd>
        <dt>Errors</dt>
        <dd className={errors.length ? "health-err" : undefined}>{errors.length}</dd>
        <dt>Warnings</dt>
        <dd className={warnings.length ? "health-warn" : undefined}>
          {warnings.length}
        </dd>
      </dl>
      {errors.length > 0 && (
        <ul className="health-list health-err">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="health-list health-warn">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
