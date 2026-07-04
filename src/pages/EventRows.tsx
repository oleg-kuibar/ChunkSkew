import { BarChart3 } from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { componentLazyImport } from "../shared/lazyRoute";
import { preloadWorkflowChunks } from "../shared/preloadWorkflowChunks";
import type { RouterMode } from "../shared/types";

const LazyDrawer = lazy(() =>
  componentLazyImport("event-drawer", "react-router", "event", () => import("../workflows/LazyEventDrawer"))().then((module) => ({
    default: module.LazyEventDrawer
  }))
);

const rows = ["Event 1"];

export function EventRowsPage({
  retainedFilePath = "/retained-file",
  routerMode,
  link
}: {
  retainedFilePath?: string;
  routerMode: RouterMode;
  link: (to: string, children: ReactNode) => ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    void preloadWorkflowChunks("event", routerMode);
  }, [routerMode]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Optional</p>
          <h1>Open one drawer</h1>
        </div>
        {link(retainedFilePath, <><BarChart3 aria-hidden="true" /> Retained file</>)}
      </section>
      <section className="most-simple-examples">
        {rows.map((row) => (
          <article className="most-simple-card" key={row}>
            <div>
              <strong>{row}</strong>
              <p>Open one lazy drawer.</p>
            </div>
            <button className="button button-light" type="button" onClick={() => setSelected(row)}>
              Open
            </button>
          </article>
        ))}
      </section>
      {selected ? (
        <Suspense fallback={<div className="loading-panel">Opening drawer...</div>}>
          <LazyDrawer row={selected} onClose={() => setSelected(null)} />
        </Suspense>
      ) : null}
    </div>
  );
}
