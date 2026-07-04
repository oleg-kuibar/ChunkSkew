import { AuditEventTable } from "../components/AuditEventTable";
import type { RouterMode } from "../shared/types";

export function AuditLogPage({ routerMode }: { routerMode: RouterMode }) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Optional</p>
          <h1>Event log</h1>
        </div>
      </section>
      <AuditEventTable routerMode={routerMode} />
    </div>
  );
}
