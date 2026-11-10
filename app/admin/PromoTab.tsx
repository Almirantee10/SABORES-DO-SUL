"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Tag, Trash2, X } from "lucide-react";
import { CATS, fmt, fmtDate, priceOf, type Product } from "@/lib/data";
import { api, ApiError } from "@/lib/admin-client";
import { promoPrice, promoState, todayStr, type Promo, type PromoState } from "@/lib/promo";
import type { StoreData } from "@/lib/store-data";
import { useCatalog } from "@/components/Catalog";

const STATE_LABEL: Record<PromoState, string> = { ativa: "No ar agora", agendada: "Agendada", encerrada: "Encerrada", pausada: "Pausada" };

const blank = (): Promo => {
  const t = todayStr();
  return { id: "promo-" + Date.now().toString(36), name: "", desc: "", percent: 10, productIds: [], start: t, end: t, active: true };
};

export function PromoTab({ onSignedOut }: { onSignedOut: () => void }) {
  const catalog = useCatalog();
  const [products, setProducts] = useState<Product[]>([]);
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [saved, setSaved] = useState("");
  const [edit, setEdit] = useState<Promo | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const today = todayStr();

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api<StoreData>("/api/store", "GET");
        if (!live) return;
        setProducts(d.products);
        setPromos(d.promos ?? []);
        setSaved(JSON.stringify(d.promos ?? []));
      } catch {
        if (live) setMsg({ ok: false, text: "Não foi possível carregar. Atualize a página." });
      }
    })();
    return () => { live = false; };
  }, []);

  const dirty = promos !== null && JSON.stringify(promos) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = async () => {
    if (!promos) return;
    setSaving(true);
    setMsg(null);
    try {
      const d = await api<{ promos: Promo[] }>("/api/admin/promos", "PUT", { promos });
      setPromos(d.promos);
      setSaved(JSON.stringify(d.promos));
      catalog.apply({ promos: d.promos });
      setMsg({ ok: true, text: "Promoções salvas. Já valem no site." });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      else setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  };

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name;
  const sorted = useMemo(() => [...(promos ?? [])].sort((a, b) => b.start.localeCompare(a.start)), [promos]);

  return (
    <div className="adm-pane">
      <div className="adm-cat">
        <p className="adm-note">Crie descontos por período. Os preços promocionais aparecem sozinhos no cardápio, no carrinho e na mensagem do pedido.</p>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit(blank())}><Plus size={16} /> <span>Nova promoção</span></button>
      </div>
      {msg && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}
      {promos === null && !msg && <p className="adm-note">Carregando…</p>}
      {promos?.length === 0 && (
        <div className="adm-card"><Tag size={26} /><h2>Nenhuma promoção ainda</h2><p className="adm-note">Toque em “Nova promoção”, escolha os produtos, o desconto e as datas.</p></div>
      )}
      {sorted.map((p) => {
        const st = promoState(p, today);
        return (
          <section key={p.id} className={`adm-card promo-card st-${st}`}>
            <div className="promo-head">
              <div><h2>{p.name}</h2><small>{fmtDate(p.start)} até {fmtDate(p.end)}</small></div>
              <span className={`state ${st}`}>{STATE_LABEL[st]}</span>
              <strong className="pct">-{p.percent}%</strong>
            </div>
            {p.desc && <p className="adm-note">{p.desc}</p>}
            <p className="promo-prods">{p.productIds.map((id) => nameOf(id) ?? "(produto removido)").join(" · ")}</p>
            <div className="adm-actions">
              <label className="adm-switch"><input type="checkbox" checked={p.active} onChange={(e) => setPromos((cur) => cur!.map((x) => (x.id === p.id ? { ...x, active: e.target.checked } : x)))} /><span>Ativa</span></label>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(p)}><Pencil size={15} /> <span>Editar</span></button>
            </div>
          </section>
        );
      })}

      {dirty && (
        <div className="adm-save">
          <span>Promoções ainda não salvas</span>
          <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setPromos(JSON.parse(saved))}>Descartar</button>
          <button className="btn btn-primary btn-md" disabled={saving} onClick={save}><Save size={16} /> <span>{saving ? "Salvando…" : "Salvar promoções"}</span></button>
        </div>
      )}

      {edit && (
        <PromoModal
          promo={edit}
          products={products}
          isNew={!promos?.some((p) => p.id === edit.id)}
          onClose={() => setEdit(null)}
          onApply={(p) => {
            setPromos((cur) => (cur!.some((x) => x.id === p.id) ? cur!.map((x) => (x.id === p.id ? p : x)) : [...cur!, p]));
            setEdit(null);
          }}
          onDelete={(id) => {
            setPromos((cur) => cur!.filter((x) => x.id !== id));
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}

function PromoModal({ promo, products, isNew, onClose, onApply, onDelete }: { promo: Promo; products: Product[]; isNew: boolean; onClose: () => void; onApply: (p: Promo) => void; onDelete: (id: string) => void }) {
  const [f, setF] = useState<Promo>(promo);
  const [err, setErr] = useState("");

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [onClose]);

  const toggle = (ids: string[], on: boolean) =>
    setF((cur) => ({ ...cur, productIds: on ? [...new Set([...cur.productIds, ...ids])] : cur.productIds.filter((x) => !ids.includes(x)) }));

  const apply = () => {
    if (!f.name.trim()) return setErr("Dê um nome à promoção.");
    if (!(f.percent >= 1 && f.percent <= 90)) return setErr("O desconto deve ficar entre 1% e 90%.");
    if (!f.start || !f.end || f.start > f.end) return setErr("Confira as datas: o fim não pode vir antes do começo.");
    if (!f.productIds.length) return setErr("Escolha ao menos um produto.");
    onApply({ ...f, name: f.name.trim(), desc: f.desc.trim() });
  };

  const sample = products.find((p) => f.productIds.includes(p.id));

  return (
    <div className="adm-modal" role="dialog" aria-modal aria-label={isNew ? "Nova promoção" : "Editar promoção"}>
      <div className="adm-back" onClick={onClose} />
      <div className="adm-sheet">
        <div className="adm-sheet-h">
          <h2>{isNew ? "Nova promoção" : "Editar promoção"}</h2>
          <button className="iconbtn" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="adm-sheet-b">
          <label className="adm-f"><span>Nome da promoção</span><input value={f.name} maxLength={60} placeholder="Ex.: Semana do Salgado" onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="adm-f"><span>Texto para o cliente (opcional)</span><input value={f.desc} maxLength={160} placeholder="Ex.: Só até domingo!" onChange={(e) => setF({ ...f, desc: e.target.value })} /></label>
          <div className="adm-two">
            <label className="adm-f"><span>Desconto (%)</span><input inputMode="numeric" value={f.percent || ""} onChange={(e) => setF({ ...f, percent: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) })} /></label>
            <label className="adm-switch pad"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /><span>Promoção ativa</span></label>
          </div>
          <div className="adm-two">
            <label className="adm-f"><span>Começa em</span><input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
            <label className="adm-f"><span>Termina em (inclusive)</span><input type="date" value={f.end} min={f.start} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
          </div>

          <div className="adm-f">
            <span>Produtos da promoção ({f.productIds.length})</span>
            {CATS.map((c) => {
              const items = products.filter((p) => p.cat === c.id);
              if (!items.length) return null;
              const ids = items.map((p) => p.id);
              const all = ids.every((id) => f.productIds.includes(id));
              return (
                <fieldset key={c.id} className="pick">
                  <legend>{c.title}</legend>
                  <label className="adm-switch"><input type="checkbox" checked={all} onChange={(e) => toggle(ids, e.target.checked)} /><span>Todos de {c.label.toLowerCase()}</span></label>
                  {items.map((p) => (
                    <label key={p.id} className="adm-switch sub"><input type="checkbox" checked={f.productIds.includes(p.id)} onChange={(e) => toggle([p.id], e.target.checked)} /><span>{p.name}</span></label>
                  ))}
                </fieldset>
              );
            })}
          </div>
          {sample && f.percent > 0 && (
            <p className="adm-note">Exemplo: <b>{sample.name}</b> sai de {fmt(priceOf(sample))} por <b>{fmt(promoPrice(priceOf(sample), f.percent))}</b>.</p>
          )}
          {err && <p className="adm-err" role="alert">{err}</p>}
          <p className="adm-note">Depois de aplicar, toque em <b>Salvar promoções</b> para publicar.</p>
        </div>
        <div className="adm-sheet-f">
          {!isNew && (
            <button className="btn btn-ghost btn-sm adm-del" onClick={() => { if (window.confirm(`Excluir a promoção "${promo.name}"?`)) onDelete(promo.id); }}><Trash2 size={15} /> <span>Excluir</span></button>
          )}
          <button className="btn btn-primary btn-md" onClick={apply}>{isNew ? "Adicionar promoção" : "Aplicar"}</button>
        </div>
      </div>
    </div>
  );
}
