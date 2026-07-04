import { LazyBoundaryDebugBadge } from "../components/UpdateSurfaces";

export function Component() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Optional</p>
          <h1>Retained file</h1>
        </div>
        <LazyBoundaryDebugBadge label="retained lazy route" />
      </section>
      <div className="simple-proof-panel">
        <span>Old file</span>
        <strong>kept</strong>
        <p>Lazy import loaded.</p>
      </div>
    </div>
  );
}
