"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Save, Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/admin-client";
import type { Cat, StoreData } from "@/lib/store-data";
import { useCatalog } from "@/components/Catalog";

type Row = Cat & { k: string };

export function CatsTab({ onSignedOut }: { onSignedOut: () => void }) {
  const catalog = useCatalog();
  const seq = useRef(0);
  const nk = () => "k" + ++seq.current;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saved, setSaved] = useState("");
  const [count, setCount] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api<StoreData>("/api/store", "GET");
        if (!live) return;
        const r = d.cats.map((c) => ({ ...c, k: nk() }));
        setRows(r);
        setSaved(JSON.stringify(d.cats));
        const n: Record<string, number> = {};
        d.products.forEach((p) => { n[p.cat] = (n[p.cat] ?? 0) + 1; });
        setCount(n);
      } catch {
        if (live) setMsg({ ok: false, text: "Não foi possível carregar as categorias. Atualize a página." });
      }
    })();
    return () => { live = false; };
  }, []);

  const clean = (r: Row[]): Cat[] => r.map(({ k: _k, ...c }) => { void _k; return c; });
  const dirty = rows !== null && JSON.stringify(clean(rows)) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = (k: string, fn: (c: Row) => Row) => setRows((r) => (r ? r.map((c) => (c.k === k ? fn(c) : c)) : r));
  const move = (i: number, dir: -1 | 1) =>
    setRows((r) => {
      if (!r || i + dir < 0 || i + dir >= r.length) return r;
      const n = r.slice();
      [n[i], n[i + dir]] = [n[i + dir], n[i]];
      return n;
    });

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    setMsg(null);
    try {
      const d = await api<{ cats: Cat[]; updatedAt: number }>("/api/admin/settings", "PUT", { cats: clean(rows) });
      setRows(d.cats.map((c) => ({ ...c, k: nk() })));
      setSaved(JSON.stringify(d.cats));
      catalog.apply({ cats: d.cats, updatedAt: d.updatedAt });
      setMsg({ ok: true, text: "Categorias salvas. O cardápio do site já mostra a nova ordem e os novos nomes." });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      else setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-pane">
      <p className="adm-note">Crie, renomeie, reordene e exclua categorias. A ordem daqui é a ordem do cardápio. Uma categoria sem produtos, ou desmarcada em Visível, não aparece para os clientes.</p>
      {msg && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}
      {!rows ? (
        <p className="adm-note">Carregando…</p>
      ) : (
        <>
          {rows.map((c, i) => {
            const n = c.id ? (count[c.id] ?? 0) : 0;
            return (
              <section key={c.k} className="adm-card">
                <div className="adm-cat">
                  <h2>{c.title || "Nova categoria"}</h2>
                  <div className="adm-actions">
                    <label className="adm-switch"><input type="checkbox" checked={c.visible !== false} onChange={(e) => patch(c.k, (x) => ({ ...x, visible: e.target.checked ? undefined : false }))} /><span>Visível</span></label>
                    <button className="iconbtn iconbtn-ghost" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp size={18} /></button>
                    <button className="iconbtn iconbtn-ghost" aria-label="Descer" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ChevronDown size={18} /></button>
                    <button
                      className="btn btn-ghost btn-sm adm-del"
                      disabled={n > 0 || rows.length <= 1}
                      title={n > 0 ? `Tem ${n} produto(s). Mova ou exclua antes.` : "Excluir categoria"}
                      onClick={() => { if (window.confirm(`Excluir a categoria "${c.title}"?`)) setRows((r) => (r ? r.filter((x) => x.k !== c.k) : r)); }}
                    >
                      <Trash2 size={15} /> <span>Excluir</span>
                    </button>
                  </div>
                </div>
                {n > 0 && <p className="adm-note">{n} produto(s) nesta categoria. Para excluir, mova ou apague os produtos antes.</p>}
                <div className="adm-two">
                  <label className="adm-f"><span>Nome da seção</span><input value={c.title} maxLength={40} onChange={(e) => patch(c.k, (x) => ({ ...x, title: e.target.value }))} /></label>
                  <label className="adm-f"><span>Nome na aba (curto)</span><input value={c.label} maxLength={24} placeholder={c.title.slice(0, 24)} onChange={(e) => patch(c.k, (x) => ({ ...x, label: e.target.value }))} /></label>
                </div>
                <div className="adm-f">
                  <span>Avisos da categoria (ex.: Pedido mínimo · 50 unidades)</span>
                  {c.info.map((inf, j) => (
                    <div key={j} className="adm-two" style={{ alignItems: "center" }}>
                      <input aria-label="Título do aviso" value={inf.label} maxLength={24} placeholder="Pedido mínimo" onChange={(e) => patch(c.k, (x) => ({ ...x, info: x.info.map((z, q) => (q === j ? { ...z, label: e.target.value } : z)) }))} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <input aria-label="Valor do aviso" style={{ flex: 1 }} value={inf.value} maxLength={40} placeholder="50 unidades" onChange={(e) => patch(c.k, (x) => ({ ...x, info: x.info.map((z, q) => (q === j ? { ...z, value: e.target.value } : z)) }))} />
                        <button className="iconbtn iconbtn-ghost" aria-label="Remover aviso" onClick={() => patch(c.k, (x) => ({ ...x, info: x.info.filter((_, q) => q !== j) }))}><X size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {c.info.length < 4 && (
                    <div><button className="btn btn-ghost btn-sm" onClick={() => patch(c.k, (x) => ({ ...x, info: [...x.info, { label: "", value: "" }] }))}><Plus size={15} /> <span>Adicionar aviso</span></button></div>
                  )}
                </div>
              </section>
            );
          })}
          <div><button className="btn btn-outline btn-md" disabled={rows.length >= 20} onClick={() => setRows((r) => (r ? [...r, { id: "", label: "", title: "", info: [], k: nk() }] : r))}><Plus size={16} /> <span>Nova categoria</span></button></div>
        </>
      )}

      {dirty && (
        <div className="adm-save">
          <span>Alterações ainda não salvas</span>
          <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setRows(JSON.parse(saved).map((c: Cat) => ({ ...c, k: nk() })))}>Descartar</button>
          <button className="btn btn-primary btn-md" disabled={saving} onClick={save}><Save size={16} /> <span>{saving ? "Salvando…" : "Salvar categorias"}</span></button>
        </div>
      )}
    </div>
  );
}
