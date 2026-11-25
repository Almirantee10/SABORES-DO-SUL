"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { PAY, waLabel } from "@/lib/data";
import { api, ApiError, moneyText, parseMoney } from "@/lib/admin-client";
import { defaultSettings, type Settings, type StoreData } from "@/lib/store-data";
import { useCatalog } from "@/components/Catalog";

type Msg = { ok: boolean; text: string } | null;

export function LojaTab({ onSignedOut }: { onSignedOut: () => void }) {
  const catalog = useCatalog();
  const [open, setOpen] = useState(catalog.open);
  const [closedMsg, setClosedMsg] = useState(catalog.closedMessage);
  const [statusBusy, setStatusBusy] = useState(false);
  const [f, setF] = useState<Settings | null>(null);
  const [saved, setSaved] = useState("");
  const [fee, setFee] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api<StoreData>("/api/store", "GET");
        if (!live) return;
        setOpen(d.open !== false);
        setClosedMsg(d.closedMessage || "");
        setF(d.settings);
        setSaved(JSON.stringify(d.settings));
        setFee(moneyText(d.settings.deliveryFee));
      } catch {
        if (live) setMsg({ ok: false, text: "Não foi possível carregar. Atualize a página." });
      }
    })();
    return () => { live = false; };
  }, []);

  const dirty = f !== null && JSON.stringify(f) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const expired = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { onSignedOut(); return true; }
    return false;
  };

  const setShop = async (next: boolean) => {
    setStatusBusy(true);
    setMsg(null);
    try {
      const d = await api<{ open: boolean; closedMessage: string }>("/api/admin/status", "PUT", { open: next, closedMessage: closedMsg });
      setOpen(d.open);
      catalog.apply({ open: d.open, closedMessage: d.closedMessage });
      setMsg({ ok: true, text: d.open ? "Loja ABERTA. Os pedidos estão liberados." : "Loja FECHADA. Os pedidos estão pausados." });
    } catch (e) {
      if (!expired(e)) setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível alterar." });
    } finally {
      setStatusBusy(false);
    }
  };

  const save = async () => {
    if (!f) return;
    setSaving(true);
    setMsg(null);
    try {
      const d = await api<{ settings: Settings; updatedAt: number }>("/api/admin/settings", "PUT", { settings: f });
      setF(d.settings);
      setSaved(JSON.stringify(d.settings));
      setFee(moneyText(d.settings.deliveryFee));
      catalog.apply({ settings: d.settings, updatedAt: d.updatedAt });
      setMsg({ ok: true, text: "Configurações salvas. O site já está atualizado." });
    } catch (e) {
      if (!expired(e)) setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((cur) => (cur ? { ...cur, [k]: v } : cur));
  const text = (k: keyof Settings, label: string, opts: { max: number; placeholder?: string; area?: boolean; hint?: string }) => (
    <label className="adm-f">
      <span>{label}</span>
      {opts.area
        ? <textarea rows={3} value={f![k] as string} maxLength={opts.max} placeholder={opts.placeholder} onChange={(e) => set(k, e.target.value as never)} />
        : <input value={f![k] as string} maxLength={opts.max} placeholder={opts.placeholder} onChange={(e) => set(k, e.target.value as never)} />}
      {opts.hint && <small className="adm-note">{opts.hint}</small>}
    </label>
  );

  return (
    <div className="adm-pane">
      <p className="adm-note">Abra ou feche a loja e mude contato, entrega, pagamento e textos. Tudo vale no site assim que você salvar.</p>
      {msg && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}

      <section className="adm-card">
        <h2>Situação da loja</h2>
        <div className="adm-seg" role="group" aria-label="Situação da loja">
          <button className={open ? "on open" : ""} disabled={statusBusy} onClick={() => setShop(true)}>● Aberta</button>
          <button className={!open ? "on closed" : ""} disabled={statusBusy} onClick={() => setShop(false)}>● Fechada</button>
        </div>
        <label className="adm-f">
          <span>Aviso quando estiver fechada (opcional)</span>
          <input value={closedMsg} maxLength={200} placeholder="Ex.: Voltamos amanhã às 8h." onChange={(e) => setClosedMsg(e.target.value)} />
        </label>
        <button className="btn btn-outline btn-sm" disabled={statusBusy} onClick={() => setShop(open)}>Salvar aviso</button>
        <p className="adm-note">Fechada: o cardápio continua visível, mas ninguém consegue adicionar itens nem enviar pedido. Quem está no site vê a mudança em até 20 segundos, ou ao voltar para a aba.</p>
      </section>

      {!f ? (
        <p className="adm-note">Carregando configurações…</p>
      ) : (
        <>
          <section className="adm-card">
            <h2>Contato e horário</h2>
            <label className="adm-f">
              <span>WhatsApp que recebe os pedidos</span>
              <input inputMode="tel" value={f.whatsapp.replace(/^55/, "")} maxLength={20} placeholder="63 99220-2561" onChange={(e) => set("whatsapp", e.target.value)} />
              <small className="adm-note">Com DDD. Aparece como {waLabel(f.whatsapp) || "…"} no site e é para onde o pedido é enviado.</small>
            </label>
            {text("instagram", "Instagram (só o nome de usuário)", { max: 80, placeholder: "saboresdosulpalmas", hint: "Deixe em branco para esconder o link." })}
            {text("tagline", "Frase de apresentação", { max: 80 })}
            {text("hours", "Horário de funcionamento (opcional)", { max: 200, placeholder: "Seg a sáb, das 8h às 18h", hint: "Aparece na página inicial, junto do contato." })}
          </section>

          <section className="adm-card">
            <h2>Recebimento</h2>
            <label className="adm-switch"><input type="checkbox" checked={f.pickupOn} onChange={(e) => set("pickupOn", e.target.checked)} /><span>Retirada no local</span></label>
            <label className="adm-switch"><input type="checkbox" checked={f.deliveryOn} onChange={(e) => set("deliveryOn", e.target.checked)} /><span>Entrega</span></label>
            <div className="adm-f">
              <span>Taxa de entrega (0 = sem taxa fixa)</span>
              <span className="adm-money">
                <i>R$</i>
                <input
                  inputMode="decimal"
                  aria-label="Taxa de entrega"
                  value={fee}
                  onChange={(e) => { setFee(e.target.value); const n = e.target.value.trim() ? parseMoney(e.target.value) : 0; if (n !== null) set("deliveryFee", n); }}
                  onBlur={() => setFee(moneyText(f.deliveryFee))}
                />
              </span>
              <small className="adm-note">Com taxa, ela entra no total do pedido quando o cliente escolhe entrega.</small>
            </div>
            {text("deliveryNote", "Aviso sobre a entrega", { max: 160, placeholder: "Ex.: Entregamos só em Palmas." })}
          </section>

          <section className="adm-card">
            <h2>Formas de pagamento</h2>
            {PAY.map((p) => (
              <label key={p.id} className="adm-switch">
                <input type="checkbox" checked={f.pay.includes(p.id)} onChange={(e) => set("pay", e.target.checked ? PAY.filter((x) => x.id === p.id || f.pay.includes(x.id)).map((x) => x.id) : f.pay.filter((x) => x !== p.id))} />
                <span>{p.label}</span>
              </label>
            ))}
          </section>

          <section className="adm-card">
            <h2>Textos do site</h2>
            {text("description", "Texto da página inicial (abaixo do título)", { max: 300, area: true })}
            {text("menuHint", "Texto no topo do cardápio", { max: 200, area: true })}
            {text("menuNote", "Aviso no fim do cardápio", { max: 200 })}
            {text("ctaTitle", "Chamada final da página inicial: título", { max: 80 })}
            {text("ctaText", "Chamada final da página inicial: texto", { max: 200, area: true })}
            <div><button className="btn btn-ghost btn-sm" onClick={() => { const d = defaultSettings(); setF({ ...f, description: d.description, menuHint: d.menuHint, menuNote: d.menuNote, ctaTitle: d.ctaTitle, ctaText: d.ctaText }); }}>Voltar aos textos originais</button></div>
          </section>
        </>
      )}

      {dirty && (
        <div className="adm-save">
          <span>Alterações ainda não salvas</span>
          <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => { const s = JSON.parse(saved) as Settings; setF(s); setFee(moneyText(s.deliveryFee)); }}>Descartar</button>
          <button className="btn btn-primary btn-md" disabled={saving} onClick={save}><Save size={16} /> <span>{saving ? "Salvando…" : "Salvar configurações"}</span></button>
        </div>
      )}
    </div>
  );
}
