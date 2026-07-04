import { X } from "lucide-react";

export function LazyEventDrawer({ row, onClose }: { row: string; onClose: () => void }) {
  return (
    <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="txn-drawer-title">
      <header>
        <div>
          <p className="eyebrow">Optional</p>
          <h2 id="txn-drawer-title">Lazy drawer loaded</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close drawer" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <div className="simple-proof-panel">
        <span>Drawer chunk</span>
        <strong>ready</strong>
        <p>{row}</p>
      </div>
    </aside>
  );
}
