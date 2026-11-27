"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, ImagePlus, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";
import { fmt, type ExtraGroup, type Product } from "@/lib/data";
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
  const [shared, setShared] = useState<ExtraGroup[]>(catalog.extras);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");

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
        if (Array.isArray(d.extras)) setShared(d.extras);
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
  /** puts a product at a typed position (1 = first) inside its category */
  const moveTo = (id: string, pos: number) =>
    setDraft((d) => {
      if (!d || !Number.isFinite(pos)) return d;
      const me = d.find((p) => p.id === id);
      if (!me) return d;
      const mates = d.filter((p) => p.cat === me.cat && p.id !== id);
      const at = Math.max(0, Math.min(mates.length, Math.round(pos) - 1));
      mates.splice(at, 0, me);
      const slots = d.map((p, i) => (p.cat === me.cat ? i : -1)).filter((i) => i >= 0);
      const n = d.slice();
      slots.forEach((slot, k) => { n[slot] = mates[k]; });
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
  const byCat = useMemo(() => {
    const k = q.trim().toLowerCase();
    return cats
      .filter((c) => !catFilter || c.id === catFilter)
      .map((c) => ({ ...c, items: (draft ?? []).filter((p) => p.cat === c.id && (!k || (p.name + " " + p.desc).toLowerCase().includes(k))) }));
  }, [draft, cats, q, catFilter]);

  return (
    <div className="adm-pane">
      <p className="adm-note">Mude valores, marque indisponíveis, destaque, duplique, reordene e adicione produtos. Para abrir ou fechar a loja, use a aba Configurações.</p>

      {msg && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}

      <div className="crm-filters">
        <label className="search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" /></label>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

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
                  <input key={`${p.id}-${idx}`} className="adm-pos" inputMode="numeric" aria-label={`Posição de ${p.name}`} title="Posição na categoria" defaultValue={idx + 1} onBlur={(e) => moveTo(p.id, Number(e.target.value))} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                  <button className="iconbtn iconbtn-ghost" aria-label="Subir" disabled={idx === 0} onClick={() => move(p.id, -1)}><ChevronUp size={18} /></button>
                  <button className="iconbtn iconbtn-ghost" aria-label="Descer" disabled={idx === c.items.length - 1} onClick={() => move(p.id, 1)}><ChevronDown size={18} /></button>
                  <button className="iconbtn iconbtn-ghost" aria-label={`Duplicar ${p.name}`} title="Duplicar" onClick={() => duplicate(p.id)}><Copy size={16} /></button>
                  <button className={`iconbtn iconbtn-ghost${p.featured ? " adm-star on" : " adm-star"}`} aria-pressed={!!p.featured} aria-label={p.featured ? `Tirar ${p.name} dos destaques` : `Destacar ${p.name}`} title={p.featured ? "Em destaque" : "Destacar"} onClick={() => patch(p.id, (x) => ({ ...x, featured: !x.featured }))}><Star size={17} /></button>
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
          shared={shared}
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

/* --------------------------------------------------------- extras (adicionais) */
export function ExtrasEditor({ value, onChange, single = false }: { value: ExtraGroup[]; onChange: (g: ExtraGroup[]) => void; single?: boolean }) {
  const uid = () => Math.random().toString(36).slice(2, 8);
  const patchG = (id: string, fn: (g: ExtraGroup) => ExtraGroup) => onChange(value.map((g) => (g.id === id ? fn(g) : g)));
  return (
    <div className="adm-f">
      {!single && <span>Adicionais e complementos (opcional)</span>}
      {value.map((g) => (
        <div key={g.id} className="adm-extra">
          <div className="adm-extra-h">
            <input aria-label="Nome do grupo" value={g.name} maxLength={40} placeholder="Ex.: Molhos, Acompanhamentos" onChange={(e) => patchG(g.id, (x) => ({ ...x, name: e.target.value }))} />
            <button className="iconbtn iconbtn-ghost" aria-label="Remover grupo" onClick={() => onChange(value.filter((x) => x.id !== g.id))}><Trash2 size={16} /></button>
          </div>
          <div className="adm-extra-rules">
            <label className="adm-switch"><input type="checkbox" checked={g.min >= 1} onChange={(e) => patchG(g.id, (x) => ({ ...x, min: e.target.checked ? 1 : 0 }))} /><span>Obrigatório</span></label>
            <label className="adm-extra-n"><small>Mín.</small><input inputMode="numeric" aria-label="Mínimo de escolhas" value={g.min} onChange={(e) => patchG(g.id, (x) => { const n = Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, x.options.length, x.max); return { ...x, min: n }; })} /></label>
            <label className="adm-extra-n"><small>Máx.</small><input inputMode="numeric" aria-label="Máximo de escolhas" value={g.max} onChange={(e) => patchG(g.id, (x) => { const n = Math.max(1, Math.min(Number(e.target.value.replace(/\D/g, "")) || 1, x.options.length)); return { ...x, max: n, min: Math.min(x.min, n) }; })} /></label>
          </div>
          {g.options.map((o) => (
            <div key={o.id} className="adm-extra-o">
              <input aria-label="Nome da opção" value={o.name} maxLength={40} placeholder="Ex.: Bacon" onChange={(e) => patchG(g.id, (x) => ({ ...x, options: x.options.map((z) => (z.id === o.id ? { ...z, name: e.target.value } : z)) }))} />
              <MoneyInput value={o.price} onChange={(v) => patchG(g.id, (x) => ({ ...x, options: x.options.map((z) => (z.id === o.id ? { ...z, price: v } : z)) }))} />
              <button className="iconbtn iconbtn-ghost" aria-label="Remover opção" disabled={g.options.length <= 1} onClick={() => patchG(g.id, (x) => { const options = x.options.filter((z) => z.id !== o.id); return { ...x, options, max: Math.min(x.max, options.length), min: Math.min(x.min, options.length) }; })}><X size={16} /></button>
            </div>
          ))}
          <div><button className="btn btn-ghost btn-sm" disabled={g.options.length >= 30} onClick={() => patchG(g.id, (x) => ({ ...x, options: [...x.options, { id: uid(), name: "", price: 0 }], max: x.max }))}><Plus size={15} /> <span>Adicionar opção</span></button></div>
        </div>
      ))}
      {!single && value.length < 8 && (
        <div><button className="btn btn-outline btn-sm" onClick={() => onChange([...value, { id: uid(), name: "", min: 0, max: 1, options: [{ id: uid(), name: "", price: 0 }] }])}><Plus size={15} /> <span>Novo grupo de adicionais</span></button></div>
      )}
      {!single && <small className="adm-note">Cada grupo tem opções com valor (0 = sem custo). O valor das opções escolhidas soma ao preço do produto. &ldquo;Obrigatório&rdquo; exige ao menos 1 escolha; o máximo limita quantas o cliente pode marcar.</small>}
    </div>
  );
}

/* ------------------------------------------------------------ product form */
function ProductModal({ shared, product, cats, isNew, onClose, onApply, onDelete }: { shared: ExtraGroup[]; product: Product; cats: Cat[]; isNew: boolean; onClose: () => void; onApply: (p: Product) => void; onDelete: (id: string) => void }) {
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
    if ((f.extras ?? []).some((g) => !g.name.trim())) return setErr("Dê um nome a cada grupo de adicionais.");
    if ((f.extras ?? []).some((g) => !g.options.some((o) => o.name.trim()))) return setErr("Cada grupo de adicionais precisa de ao menos uma opção com nome.");
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
            <span>Promoção só deste produto (% de desconto, opcional)</span>
            <input inputMode="numeric" value={f.salePct ?? ""} placeholder="Ex.: 10" onChange={(e) => setF({ ...f, salePct: Math.min(90, Number(e.target.value.replace(/\D/g, "")) || 0) || undefined })} />
            <small className="adm-note">
              {f.salePct
                ? `Preço com desconto: ${(hasSizes ? f.sizes!.map((s) => `${s.label} ${fmt(Math.round(s.price * (100 - f.salePct!)) / 100)}`).join(" · ") : fmt(Math.round((f.price ?? 0) * (100 - f.salePct)) / 100))}. Aparece no cardápio e em Destaques, com o selo -${f.salePct}%.`
                : "Deixe em branco para não ter desconto. Se houver uma promoção em Promoções, vale o maior desconto."}
            </small>
          </label>
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
          <ExtrasEditor value={f.extras ?? []} onChange={(g) => setF({ ...f, extras: g.length ? g : undefined })} />
          {shared.length > 0 && (
            <div className="adm-f">
              <span>Adicionais compartilhados (aba Adicionais)</span>
              {shared.map((g) => (
                <label key={g.id} className="adm-switch">
                  <input type="checkbox" checked={(f.extraIds ?? []).includes(g.id)} onChange={(e) => { const cur = f.extraIds ?? []; const next = e.target.checked ? [...cur, g.id] : cur.filter((x) => x !== g.id); setF({ ...f, extraIds: next.length ? next : undefined }); }} />
                  <span>{g.name} ({g.options.length} opç{g.options.length === 1 ? "ão" : "ões"}{g.min ? ", obrigatório" : ""})</span>
                </label>
              ))}
            </div>
          )}
          <label className="adm-f"><span>Selo (opcional)</span><input value={f.badge ?? ""} maxLength={20} placeholder="Ex.: Novo" onChange={(e) => setF({ ...f, badge: e.target.value })} /></label>
          <label className="adm-switch">
            <input type="checkbox" checked={!!f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} />
            <span>Produto em destaque (aparece em &ldquo;Destaques&rdquo; na página inicial e no cardápio)</span>
          </label>
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
