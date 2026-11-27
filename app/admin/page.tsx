"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, ClipboardList, FileText, KeyRound, LayoutDashboard, LayoutList, ListPlus, Lock, LogOut, Settings, Tag, Users, UtensilsCrossed } from "lucide-react";
import { api, ApiError } from "@/lib/admin-client";
import { useCatalog } from "@/components/Catalog";
import { AccessTab } from "./AccessTab";
import { AdicionaisTab } from "./AdicionaisTab";
import { CatsTab } from "./CatsTab";
import { CrmTab, type CrmView } from "./CrmTab";
import { LojaTab } from "./LojaTab";
import { MenuTab } from "./MenuTab";
import { PromoTab } from "./PromoTab";

type Session = { configured: boolean; authenticated: boolean; user?: string };

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
  return <Shell user={sess.user ?? ""} onSignedOut={load} />;
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
        <p className="adm-note">Entre para gerenciar a loja.</p>
        <label className="adm-f"><span>Usuário</span><input autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} required /></label>
        <label className="adm-f"><span>Senha</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="adm-err" role="alert">{err}</p>}
        <button className="btn btn-primary btn-lg btn-full" disabled={busy || !user || !password}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------- the areas */
const AREAS = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", Icon: ClipboardList },
  { id: "clientes", label: "Clientes", Icon: Users },
  { id: "produtos", label: "Produtos", Icon: UtensilsCrossed },
  { id: "categorias", label: "Categorias", Icon: LayoutList },
  { id: "adicionais", label: "Adicionais", Icon: ListPlus },
  { id: "promocoes", label: "Promoções", Icon: Tag },
  { id: "faturamento", label: "Faturamento", Icon: BarChart3 },
  { id: "relatorios", label: "Relatórios", Icon: FileText },
  { id: "configuracoes", label: "Configurações", Icon: Settings },
  { id: "acesso", label: "Acesso", Icon: KeyRound },
] as const;type Area = (typeof AREAS)[number]["id"];

function Shell({ user, onSignedOut }: { user: string; onSignedOut: () => void }) {
  const [area, setArea] = useState<Area>("dashboard");
  const catalog = useCatalog();
  const [manual, setManual] = useState<boolean | null>(null); // the owner's own open/closed switch
  const [closedMsg, setClosedMsg] = useState("");
  const [novos, setNovos] = useState(0);
  const [togglingShop, setTogglingShop] = useState(false);

  // shop switch + number of new orders for the badge (checked again every 30 s)
  useEffect(() => {
    let live = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const d = await api<{ orders: { status: string }[] }>("/api/admin/orders", "GET");
        if (live) setNovos(d.orders.filter((o) => o.status === "novo").length);
      } catch {}
    };
    (async () => {
      try {
        const d = await api<{ open: boolean; closedMessage: string }>("/api/store", "GET");
        if (live) { setManual(d.open !== false); setClosedMsg(d.closedMessage || ""); }
      } catch {}
    })();
    void tick();
    const t = setInterval(tick, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const toggleShop = async () => {
    if (manual === null || togglingShop) return;
    setTogglingShop(true);
    try {
      const d = await api<{ open: boolean; closedMessage: string }>("/api/admin/status", "PUT", { open: !manual, closedMessage: closedMsg });
      setManual(d.open);
      catalog.apply({ open: d.open, closedMessage: d.closedMessage });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
    } finally {
      setTogglingShop(false);
    }
  };

  const signOut = async () => {
    try { await api("/api/admin/logout", "POST", {}); } catch {}
    onSignedOut();
  };

  return (
    <div className="adm">
      <header className="adm-top">
        <h1>Painel do administrador</h1>
        <div className="adm-top-r">
          {manual !== null && (
            <button className={`shop-pill ${catalog.open ? "is-open" : "is-closed"}`} onClick={toggleShop} disabled={togglingShop} title="Toque para abrir ou fechar a loja" aria-label={manual ? "Fechar a loja" : "Abrir a loja"}>
              <i aria-hidden />
              {manual ? (catalog.open ? "Loja aberta" : "Fora do horário") : "Loja fechada"}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={signOut}><LogOut size={16} /> <span>Sair</span></button>
        </div>
      </header>

      <nav className="adm-areas" aria-label="Áreas do painel">
        {AREAS.map(({ id, label, Icon }) => (
          <button key={id} className={area === id ? "on" : ""} aria-current={area === id ? "page" : undefined} onClick={() => setArea(id)}>
            <Icon size={18} /> <span>{label}</span>{id === "pedidos" && novos > 0 ? <em className="dot">{novos}</em> : null}
          </button>
        ))}
      </nav>

      {(area === "dashboard" || area === "pedidos" || area === "clientes" || area === "faturamento" || area === "relatorios") && <CrmTab key={area} view={area as CrmView} onSignedOut={onSignedOut} />}
      {area === "produtos" && <MenuTab onSignedOut={onSignedOut} />}
      {area === "adicionais" && <AdicionaisTab onSignedOut={onSignedOut} />}
      {area === "categorias" && <CatsTab onSignedOut={onSignedOut} />}
      {area === "promocoes" && <PromoTab onSignedOut={onSignedOut} />}
      {area === "configuracoes" && <LojaTab onSignedOut={onSignedOut} />}      {area === "acesso" && <AccessTab user={user} onChanged={() => void 0} onSignedOut={onSignedOut} />}
    </div>
  );
}
