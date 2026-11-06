"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Lock, LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { CATS, fmt, type Product } from "@/lib/data";
import { api, ApiError, moneyText, parseMoney, uploadPhoto } from "@/lib/admin-client";
import type { StoreData } from "@/lib/store-data";
import { useCatalog } from "@/components/Catalog";
import { Thumb } from "@/components/ui";

type Session = { configured: boolean; authenticated: boolean };

export default function Admin() {
  const [sess, setSess] = useState<Session | null>(null);

  const load = useCallback(async () => {
    try {
      setSess(await api<Session>("/api/admin/session", "GET"));
    } catch {
      setSess({ configured: true, authenticated: false });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- asks the server whether we are signed in
    void load();
  }, [load]);

  if (!sess) return <div className="adm"><p className="adm-note">Carregando…</p></div>;
  if (!sess.configured)
    return (
      <div className="adm adm-narrow">
        <div className="adm-card">
          <Lock size={28} />
          <h1>Área restrita</h1>
          <p className="adm-note">O acesso do administrador ainda não foi configurado. Na Vercel, cadastre as variáveis <b>ADMIN_USER</b> e <b>ADMIN_PASSWORD</b> e publique de novo.</p>
        </div>
      </div>
    );
  if (!sess.authenticated) return <Login onDone={load} />;
  return <Panel onSignedOut={load} />;
}

/* ------------------------------------------------------------------ login */
function Login({ onDone }: { onDone: () => void }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/login", "POST", { user, password });
      setPassword("");
      onDone();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm adm-narrow">
      <form className="adm-card" onSubmit={submit}>
        <Lock size={28} />
        <h1>Área restrita</h1>
        <p className="adm-note">Entre para gerenciar o cardápio.</p>
        <label className="adm-f"><span>Usuário</span><input autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} required /></label>
        <label className="adm-f"><span>Senha</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="adm-err" role="alert">{err}</p>}
        <button className="btn btn-primary btn-lg btn-full" disabled={busy || !user || !password}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ panel */
const newProduct = (cat: string): Product => ({ id: "novo-" + Date.now().toString(36), cat, name: "", desc: "", img: "", price: 0 });

function Panel({ onSignedOut }: { onSignedOut: () => void }) {
  const catalog = useCatalog();
  const [draft, setDraft] = useState<Product[] | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [closedMsg, setClosedMsg] = useState(catalog.closedMessage);
  const [statusBusy, setStatusBusy] = useState(false);

  // always edit the latest saved menu, not a possibly stale copy
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api<StoreData>("/api/store", "GET");
        if (!live) return;
        setDraft(d.products);
        setSavedJson(JSON.stringify(d.products));
        setClosedMsg(d.closedMessage || "");
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

  const setOpen = async (open: boolean) => {
    setStatusBusy(true);
    setMsg(null);
    try {
      const d = await api<{ open: boolean; closedMessage: string }>("/api/admin/status", "PUT", { open, closedMessage: closedMsg });
      catalog.apply({ open: d.open, closedMessage: d.closedMessage });
      setMsg({ ok: true, text: d.open ? "Loja ABERTA. Os pedidos estão liberados." : "Loja FECHADA. Os pedidos estão pausados." });
    } catch (e) {
      if (!expired(e)) setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível alterar." });
    } finally {
      setStatusBusy(false);
    }
  };

  const signOut = async () => {
    try { await api("/api/admin/logout", "POST", {}); } catch {}
    onSignedOut();
  };

  const patch = (id: string, fn: (p: Product) => Product) => setDraft((d) => (d ? d.map((p) => (p.id === id ? fn(p) : p)) : d));
  const byCat = useMemo(() => CATS.map((c) => ({ ...c, items: (draft ?? []).filter((p) => p.cat === c.id) })), [draft]);

  return (
    <div className="adm">
      <header className="adm-top">
        <div>
          <h1>Painel do administrador</h1>
          <p className="adm-note">Mude valores, marque esgotados, adicione produtos e abra ou feche a loja.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={signOut}><LogOut size={16} /> <span>Sair</span></button>
      </header>

      {msg && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}

      <section className="adm-card">
        <h2>Loja</h2>
        <div className="adm-seg" role="group" aria-label="Situação da loja">
          <button className={catalog.open ? "on open" : ""} disabled={statusBusy} onClick={() => setOpen(true)}>● Aberta</button>
          <button className={!catalog.open ? "on closed" : ""} disabled={statusBusy} onClick={() => setOpen(false)}>● Fechada</button>
        </div>
        <label className="adm-f">
          <span>Aviso quando estiver fechada (opcional)</span>
          <input value={closedMsg} maxLength={200} placeholder="Ex.: Voltamos amanhã às 8h." onChange={(e) => setClosedMsg(e.target.value)} />
        </label>
        <button className="btn btn-outline btn-sm" disabled={statusBusy} onClick={() => setOpen(catalog.open)}>Salvar aviso</button>
        <p className="adm-note">Fechada: o cardápio continua visível, mas ninguém consegue adicionar itens nem enviar pedido.</p>
      </section>

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
            {c.items.map((p) => (
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
                  <label className="adm-switch">
                    <input type="checkbox" checked={!!p.soldOut} onChange={(e) => patch(p.id, (x) => ({ ...x, soldOut: e.target.checked }))} />
                    <span>Esgotado</span>
                  </label>
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
function ProductModal({ product, isNew, onClose, onApply, onDelete }: { product: Product; isNew: boolean; onClose: () => void; onApply: (p: Product) => void; onDelete: (id: string) => void }) {
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
              {CATS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
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
          <label className="adm-switch">
            <input type="checkbox" checked={!!f.soldOut} onChange={(e) => setF({ ...f, soldOut: e.target.checked })} />
            <span>Produto esgotado</span>
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
