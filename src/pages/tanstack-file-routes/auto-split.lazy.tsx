import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/auto-split")({
  component: () => <div className="loading-panel">Auto-code-split route sample loaded.</div>
});
