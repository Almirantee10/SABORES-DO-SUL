"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { PAY, fmt } from "@/lib/data";
import { api, ApiError, moneyText, parseMoney } from "@/lib/admin-client";
import { statusLabel, type Order, type OrderItem } from "@/lib/orders";

type Line = { key: string; item: OrderItem; price: string };

/** Edit an order: customer, delivery, payment, notes, fee and every item (name, quantity, unit price; lines can be removed or added). */
export function OrderEditor({ order, onClose, onSaved, onSignedOut }: { order: Order; onClose: () => void; onSaved: () => void; onSignedOut: () => void }) {
  const [f, setF] = useState({
    name: order.name, phone: order.phone, delivery: order.delivery, address: order.address, mapLink: order.mapLink,
    date: order.date, time: order.time, pay: order.pay, troco: order.troco, notes: order.notes,
    fee: moneyText(order.fee ?? 0), discount: order.discount ? moneyText(order.discount) : "", payStatus: order.payStatus === "pago" ? "pago" : "pendente",
  });
  const [lines, setLines] = useState<Line[]>(() => order.items.map((item, i) => ({ key: "l" + i, item, price: moneyText(item.price) })));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [onClose]);

  const fee = f.fee.trim() ? parseMoney(f.fee) : 0;
  const discount = f.discount.trim() ? parseMoney(f.discount) : 0;
  const total = Math.max(0, lines.reduce((a, l) => a + l.item.qty * (parseMoney(l.price) ?? 0), 0) + (fee ?? 0) - (discount ?? 0));
  const patchLine = (key: string, fn: (l: Line) => Line) => setLines((ls) => ls.map((l) => (l.key === key ? fn(l) : l)));

  const save = async () => {
    setErr("");
    if (fee === null) return setErr("Taxa de entrega inválida.");
    if (discount === null) return setErr("Desconto inválido.");
    if (lines.some((l) => parseMoney(l.price) === null)) return setErr("Confira o valor de cada item.");
    setBusy(true);
    try {
      await api("/api/admin/orders", "PUT", {
        id: order.id,
        edit: { ...f, fee, discount, items: lines.map((l) => ({ ...l.item, price: parseMoney(l.price) ?? 0 })) },
      });
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      else setErr(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-modal" role="dialog" aria-modal aria-label="Editar pedido">
      <div className="adm-back" onClick={onClose} />
      <div className="adm-sheet">
        <div className="adm-sheet-h">
          <h2>Editar pedido #{order.id.slice(8).toUpperCase()}</h2>
          <button className="iconbtn" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="adm-sheet-b">
          <div className="adm-two">
            <label className="adm-f"><span>Cliente</span><input value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label className="adm-f"><span>Telefone</span><input inputMode="tel" value={f.phone} maxLength={20} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          </div>
          <div className="adm-f">
            <span>Recebimento</span>
            <div className="adm-seg" role="group" aria-label="Recebimento">
              <button className={f.delivery === "retirada" ? "on open" : ""} onClick={() => setF({ ...f, delivery: "retirada" })}>Retirada</button>
              <button className={f.delivery === "entrega" ? "on open" : ""} onClick={() => setF({ ...f, delivery: "entrega" })}>Entrega</button>
            </div>
          </div>
          {f.delivery === "entrega" && (
            <>
              <label className="adm-f"><span>Endereço</span><input value={f.address} maxLength={200} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
              <label className="adm-f"><span>Link do mapa (opcional)</span><input value={f.mapLink} maxLength={300} placeholder="https://..." onChange={(e) => setF({ ...f, mapLink: e.target.value })} /></label>
            </>
          )}
          <div className="adm-two">
            <label className="adm-f"><span>Data</span><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="adm-f"><span>Horário</span><input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
          </div>
          <div className="adm-two">
            <label className="adm-f">
              <span>Forma de pagamento</span>
              <select value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>
                {PAY.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="adm-f">
              <span>Pagamento</span>
              <select value={f.payStatus} onChange={(e) => setF({ ...f, payStatus: e.target.value })}>
                <option value="pendente">A receber</option>
                <option value="pago">Pago</option>
              </select>
            </label>
          </div>
          {f.pay === "dinheiro" && <label className="adm-f"><span>Troco para</span><input value={f.troco} maxLength={30} onChange={(e) => setF({ ...f, troco: e.target.value })} /></label>}

          <div className="adm-f">
            <span>Itens</span>
            {lines.map((l) => (
              <div key={l.key} className="adm-extra">
                <div className="adm-extra-h">
                  <input aria-label="Nome do item" value={l.item.name} maxLength={80} onChange={(e) => patchLine(l.key, (x) => ({ ...x, item: { ...x.item, name: e.target.value } }))} />
                  <button className="iconbtn iconbtn-ghost" aria-label="Remover item" disabled={lines.length <= 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 size={16} /></button>
                </div>
                {(l.item.size || l.item.flavors.length > 0 || (l.item.extras?.length ?? 0) > 0) && (
                  <small className="adm-note">{[l.item.size, l.item.flavors.join(", "), (l.item.extras ?? []).map((e) => "+" + e.name).join(", ")].filter(Boolean).join(" · ")}</small>
                )}
                <div className="adm-extra-rules">
                  <label className="adm-extra-n"><small>Qtd.</small><input inputMode="numeric" aria-label="Quantidade" value={l.item.qty} onChange={(e) => patchLine(l.key, (x) => ({ ...x, item: { ...x.item, qty: Math.min(5000, Number(e.target.value.replace(/\D/g, "")) || 0) } }))} /></label>
                  <label className="adm-extra-n"><small>Valor un. R$</small><input inputMode="decimal" style={{ width: 90 }} aria-label="Valor unitário" value={l.price} onChange={(e) => patchLine(l.key, (x) => ({ ...x, price: e.target.value }))} /></label>
                  <b>{fmt(l.item.qty * (parseMoney(l.price) ?? 0))}</b>
                </div>
              </div>
            ))}
            <div>
              <button className="btn btn-outline btn-sm" disabled={lines.length >= 60} onClick={() => setLines((ls) => [...ls, { key: "n" + Date.now(), item: { pid: "", name: "", size: "", qty: 1, price: 0, pct: 0, flavors: [], obs: "" }, price: "0,00" }])}><Plus size={15} /> <span>Adicionar item</span></button>
            </div>
          </div>

          <div className="adm-two">
            <label className="adm-f"><span>Taxa de entrega (R$)</span><input inputMode="decimal" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} /></label>
            <label className="adm-f"><span>Desconto no pedido (R$)</span><input inputMode="decimal" value={f.discount} placeholder="0,00" onChange={(e) => setF({ ...f, discount: e.target.value })} /></label>
          </div>
          <label className="adm-f"><span>Observações do pedido</span><textarea rows={2} value={f.notes} maxLength={300} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          <p className="adm-note"><b>Total: {fmt(total)}</b> (itens + taxa - desconto). O total é recalculado ao salvar.</p>
          <div className="adm-f">
            <span>Linha do tempo</span>
            {(order.history?.length ? order.history : [{ status: "novo" as const, at: order.createdAt }]).map((h, i) => (
              <small key={i} className="adm-note">{statusLabel(h.status)} · {new Date(h.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>
            ))}
          </div>
          {err && <p className="adm-err" role="alert">{err}</p>}
        </div>
        <div className="adm-sheet-f">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-md" disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar pedido"}</button>
        </div>
      </div>
    </div>
  );
}
