"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, ImagePlus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { fmt, type Product } from "@/lib/data";
import { api, ApiError, moneyText, parseMoney, uploadPhoto } from "@/lib/admin-client";
import type { Cat, StoreData } from "@/lib/store-data";
import { useCatalog } from "@/components/Catalog";
import { Thumb } from "@/components/ui";
const availOf = (p: Product) => (!p.soldOut ? "ok" : p.paused ? "pause" : "out");
const withAvail = (p: Product, v: string): Product => {
  const { soldOut: _s, paused: _p, ...rest } = p;
  void _s; void _p;
  return v === "ok" ? rest : v === "pause" ? { ...rest, soldOut: true, paused: true } : { ...rest, soldOut: true };
};
const newProduct = (cat: string): Product => ({ id: "novo-" + Date.now().toString(36), cat, name: "", desc: "", img: "", price: 0 });

export function MenuTab({ onSignedOut }: { onSignedOut: () => void }) {
  const catalog = useCatalog();
  const [draft, setDraft] = useState<Product[] | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState<Cat[]>(catalog.cats);

  // always edit the latest saved menu, not a possibly stale copy
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api<StoreData>("/api/store", "GET");
        if (!live) return;
        setDraft(d.products);
        setSavedJson(JSON.stringify(d.products));
        if (Array.isArray(d.cats) && d.cats.length) setCats(d.cats);
      } catch {
        if (live) setMsg({ ok: false, text: "Não foi possível carregar o cardápio. Atualize a página." });
      }
    })();
    return () => { live = false; };
  }, []);

  const dirty = draft !== null && JSON.stringify(draft) !== savedJson;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const expired = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      onSignedOut();
      return true;
    }
    return false;
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMsg(null);
    try {
      const d = await api<StoreData>("/api/admin/store", "PUT", { products: draft });
      setDraft(d.products);
      setSavedJson(JSON.stringify(d.products));
      catalog.apply({ products: d.products, updatedAt: d.updatedAt });
      setMsg({ ok: true, text: "Alterações salvas. O cardápio já está atualizado no site." });
    } catch (e) {
      if (!expired(e)) setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  };

  const patch = (id: string, fn: (p: Product) => Product) => setDraft((d) => (d ? d.map((p) => (p.id === id ? fn(p) : p)) : d));
  /** moves a product up or down inside its category */
  const move = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const i = d.findIndex((p) => p.id === id);
      let j = i + dir;
      while (j >= 0 && j < d.length && d[j].cat !== d[i].cat) j += dir;
      if (j < 0 || j >= d.length) return d;
      const n = d.slice();
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const duplicate = (id: string) =>
    setDraft((d) => {
      if (!d) return d;
      const i = d.findIndex((p) => p.id === id);
      const src = d[i];
      const copy: Product = { ...JSON.parse(JSON.stringify(src)), id: "novo-" + Date.now().toString(36), name: src.name + " (cópia)" };
      return [...d.slice(0, i + 1), copy, ...d.slice(i + 1)];
    });
  const byCat = useMemo(() => cats.map((c) => ({ ...c, items: (draft ?? []).filter((p) => p.cat === c.id) })), [draft, cats]);

  return (
    <div className="adm-pane">
      <p className="adm-note">Mude valores, marque esgotados, duplique, reordene e adicione produtos. Para abrir ou fechar a loja, use a aba Loja.</p>

      {msg && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}

      {!draft ? (
        <p className="adm-note">Carregando cardápio…</p>
      ) : (
        byCat.map((c) => (
          <section key={c.id} className="adm-card">
            <div className="adm-cat">
              <h2>{c.title}</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(newProduct(c.id))}><Plus size={16} /> <span>Adicionar produto</span></button>
            </div>
            {c.items.length === 0 && <p className="adm-note">Nenhum produto nesta categoria.</p>}
            {c.items.map((p, idx) => (
              <div key={p.id} className={`adm-row${p.soldOut ? " off" : ""}`}>
                <Thumb src={p.img} size={56} icon={24} />
                <div className="adm-info">
                  <b>{p.name || "(sem nome)"}</b>
                  <div className="adm-prices">
                    {p.sizes
                      ? p.sizes.map((s, i) => (
                          <label key={s.id}>
                            <small>{s.label}</small>
                            <MoneyInput value={s.price} onChange={(v) => patch(p.id, (x) => ({ ...x, sizes: x.sizes!.map((z, k) => (k === i ? { ...z, price: v } : z)) }))} />
                          </label>
                        ))
                      : (
                        <label>
                          <small>Valor</small>
                          <MoneyInput value={p.price ?? 0} onChange={(v) => patch(p.id, (x) => ({ ...x, price: v }))} />
                        </label>
                      )}
                  </div>
                </div>
                <div className="adm-actions">
                  <button className="iconbtn iconbtn-ghost" aria-label="Subir" disabled={idx === 0} onClick={() => move(p.id, -1)}><ChevronUp size={18} /></button>
                  <button className="iconbtn iconbtn-ghost" aria-label="Descer" disabled={idx === c.items.length - 1} onClick={() => move(p.id, 1)}><ChevronDown size={18} /></button>
                  <button className="iconbtn iconbtn-ghost" aria-label={`Duplicar ${p.name}`} title="Duplicar" onClick={() => duplicate(p.id)}><Copy size={16} /></button>
                  <select aria-label={`Disponibilidade de ${p.name}`} value={availOf(p)} onChange={(e) => patch(p.id, (x) => withAvail(x, e.target.value))}>
                    <option value="ok">Disponível</option>
                    <option value="out">Indisponível</option>
                    <option value="pause">Pausado</option>
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}><Pencil size={15} /> <span>Editar</span></button>
                </div>
              </div>
            ))}
          </section>
        ))
      )}

      {dirty && (
        <div className="adm-save">
          <span>Alterações ainda não salvas</span>
          <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setDraft(JSON.parse(savedJson))}>Descartar</button>
          <button className="btn btn-primary btn-md" disabled={saving} onClick={save}><Save size={16} /> <span>{saving ? "Salvando…" : "Salvar alterações"}</span></button>
        </div>
      )}

      {editing && (
        <ProductModal
          product={editing}
          cats={cats}
          isNew={!draft?.some((p) => p.id === editing.id)}
          onClose={() => setEditing(null)}
          onApply={(p) => {
            setDraft((d) => (d ? (d.some((x) => x.id === p.id) ? d.map((x) => (x.id === p.id ? p : x)) : [...d, p]) : d));
            setEditing(null);
          }}
          onDelete={(id) => {
            setDraft((d) => (d ? d.filter((x) => x.id !== id) : d));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ money input */
function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(moneyText(value));
  const typing = useRef(false);
  useEffect(() => {
    // follow outside changes (like "Descartar"), but never overwrite what is being typed
    if (!typing.current) setText(moneyText(value));
  }, [value]);
  return (
    <span className="adm-money">
      <i>R$</i>
      <input
        inputMode="decimal"
        value={text}
        aria-label="Valor"
        onFocus={() => { typing.current = true; }}
        onBlur={() => { typing.current = false; setText(moneyText(value)); }}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseMoney(e.target.value);
          if (n !== null) onChange(n);
        }}
      />
    </span>
  );
}

/* ------------------------------------------------------------ product form */
function ProductModal({ product, cats, isNew, onClose, onApply, onDelete }: { product: Product; cats: Cat[]; isNew: boolean; onClose: () => void; onApply: (p: Product) => void; onDelete: (id: string) => void }) {
  const [f, setF] = useState<Product>(product);
  const [flavorsText, setFlavorsText] = useState((product.flavors ?? []).join("\n"));
  const [err, setErr] = useState("");
  const [up, setUp] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const hasSizes = !!f.sizes?.length;

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [onClose]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file0 = e.target.files?.[0];
    e.target.value = "";
    if (!file0) return;
    setUp(true);
    setErr("");
    try {
      const url = await uploadPhoto(file0);
      setF((cur) => ({ ...cur, img: url }));
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Não foi possível enviar a foto.");
    } finally {
      setUp(false);
    }
  };

  const apply = () => {
    const name = f.name.trim();
    if (!name) return setErr("Dê um nome ao produto.");
    if (!hasSizes && !(f.price !== undefined && f.price >= 0)) return setErr("Informe o valor.");
    const flavors = flavorsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const out: Product = { ...f, name, desc: f.desc.trim(), flavors: flavors.length ? flavors : undefined };
    if (!flavors.length) delete out.pick;
    if (!out.min || out.min < 2) delete out.min;
    if (!out.badge?.trim()) delete out.badge;
    onApply(out);
  };

  return (
    <div className="adm-modal" role="dialog" aria-modal aria-label={isNew ? "Novo produto" : "Editar produto"}>
      <div className="adm-back" onClick={onClose} />
      <div className="adm-sheet">
        <div className="adm-sheet-h">
          <h2>{isNew ? "Novo produto" : "Editar produto"}</h2>
          <button className="iconbtn" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="adm-sheet-b">
          <div className="adm-photo">
            <Thumb src={f.img} size={96} icon={36} />
            <div>
              <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
              <button className="btn btn-outline btn-sm" disabled={up} onClick={() => file.current?.click()}><ImagePlus size={16} /> <span>{up ? "Enviando…" : f.img ? "Trocar foto" : "Escolher foto"}</span></button>
              {f.img && <button className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, img: "" })}>Remover foto</button>}
              <p className="adm-note">A foto é ajustada automaticamente.</p>
            </div>
          </div>

          <label className="adm-f"><span>Nome</span><input value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="adm-f"><span>Descrição</span><textarea rows={3} value={f.desc} maxLength={300} onChange={(e) => setF({ ...f, desc: e.target.value })} /></label>
          <label className="adm-f">
            <span>Categoria</span>
            <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>

          {hasSizes ? (
            <div className="adm-f">
              <span>Valores</span>
              <div className="adm-prices">
                {f.sizes!.map((s, i) => (
                  <label key={s.id}><small>{s.label} ({s.sub.replace(/ · .*/, "")})</small>
                    <MoneyInput value={s.price} onChange={(v) => setF((cur) => ({ ...cur, sizes: cur.sizes!.map((z, k) => (k === i ? { ...z, price: v } : z)) }))} />
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="adm-two">
              <div className="adm-f"><span>Valor (por unidade)</span><MoneyInput value={f.price ?? 0} onChange={(v) => setF({ ...f, price: v })} /></div>
              <label className="adm-f"><span>Pedido mínimo (opcional)</span><input inputMode="numeric" value={f.min ?? ""} placeholder="1" onChange={(e) => setF({ ...f, min: Number(e.target.value.replace(/\D/g, "")) || undefined })} /></label>
            </div>
          )}

          <label className="adm-f">
            <span>Sabores (um por linha, opcional)</span>
            <textarea rows={4} value={flavorsText} onChange={(e) => setFlavorsText(e.target.value)} placeholder={"Ex.:\nChocolate\nMorango"} />
          </label>
          {flavorsText.trim() && !hasSizes && (
            <label className="adm-f">
              <span>Quantos sabores o cliente pode escolher</span>
              <input inputMode="numeric" value={f.pick ?? ""} placeholder="Todos" onChange={(e) => setF({ ...f, pick: Number(e.target.value.replace(/\D/g, "")) || undefined })} />
            </label>
          )}
          <label className="adm-f"><span>Selo (opcional)</span><input value={f.badge ?? ""} maxLength={20} placeholder="Ex.: Novo" onChange={(e) => setF({ ...f, badge: e.target.value })} /></label>
          <label className="adm-f">
            <span>Disponibilidade</span>
            <select value={availOf(f)} onChange={(e) => setF(withAvail(f, e.target.value))}>
              <option value="ok">Disponível</option>
              <option value="out">Indisponível (esgotado)</option>
              <option value="pause">Pausado temporariamente</option>
            </select>
            <small className="adm-note">Indisponível ou pausado: o produto continua no cardápio, mas o cliente não consegue pedir. Volte para Disponível quando quiser.</small>
          </label>
          {err && <p className="adm-err" role="alert">{err}</p>}
          <p className="adm-note">Depois de aplicar, toque em <b>Salvar alterações</b> para publicar no site.</p>
        </div>
        <div className="adm-sheet-f">
          {!isNew && (
            <button className="btn btn-ghost btn-sm adm-del" onClick={() => { if (window.confirm(`Excluir "${product.name}" do cardápio?`)) onDelete(product.id); }}>
              <Trash2 size={15} /> <span>Excluir</span>
            </button>
          )}
          <button className="btn btn-primary btn-md" disabled={up} onClick={apply}>{isNew ? "Adicionar ao cardápio" : "Aplicar"} {f.price && !hasSizes ? "· " + fmt(f.price) : ""}</button>
        </div>
      </div>
    </div>
  );
}
