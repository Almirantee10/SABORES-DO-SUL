"use client";

import { useCatalog } from "./Catalog";

/** "Aberto" / "Fechado" pill, with the shop's own message when it is closed. */
export function ShopStatus({ compact = false }: { compact?: boolean }) {
  const { open, closedMessage, ready } = useCatalog();
  if (!ready) return <div className={`shop-status${compact ? " compact" : ""}`} aria-hidden style={{ visibility: "hidden" }}><span className="shop-pill">…</span></div>;
  return (
    <div className={`shop-status${compact ? " compact" : ""}`} role="status">
      <span className={`shop-pill ${open ? "is-open" : "is-closed"}`}>
        <i aria-hidden />
        {open ? "Aberto" : "Fechado"}
      </span>
      {!open && <p>{closedMessage || "Estamos fechados no momento. Você pode olhar o cardápio, mas os pedidos estão pausados."}</p>}
    </div>
  );
}
