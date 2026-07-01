import { createLazyRoute } from "@tanstack/react-router";

export const Route = createLazyRoute("/debug/tanstack-pending")({
  component: () => <div className="loading-panel">TanStack lazy pending component loaded.</div>,
  pendingComponent: () => <div className="loading-panel">TanStack pending fallback...</div>
});
