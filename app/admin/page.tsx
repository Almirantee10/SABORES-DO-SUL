"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Lock, LogOut, Tag, UtensilsCrossed } from "lucide-react";
import { api, ApiError } from "@/lib/admin-client";
import { CrmTab } from "./CrmTab";
import { MenuTab } from "./MenuTab";
import { PromoTab } from "./PromoTab";

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
  return <Shell onSignedOut={load} />;
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

/* ------------------------------------------------------- the three areas */
const AREAS = [
  { id: "cardapio", label: "Cardápio", Icon: UtensilsCrossed },
  { id: "crm", label: "CRM", Icon: BarChart3 },
  { id: "promocoes", label: "Promoções", Icon: Tag },
] as const;
type Area = (typeof AREAS)[number]["id"];

function Shell({ onSignedOut }: { onSignedOut: () => void }) {
  const [area, setArea] = useState<Area>("cardapio");

  const signOut = async () => {
    try { await api("/api/admin/logout", "POST", {}); } catch {}
    onSignedOut();
  };

  return (
    <div className="adm">
      <header className="adm-top">
        <h1>Painel do administrador</h1>
        <button className="btn btn-ghost btn-sm" onClick={signOut}><LogOut size={16} /> <span>Sair</span></button>
      </header>

      <nav className="adm-areas" aria-label="Áreas do painel">
        {AREAS.map(({ id, label, Icon }) => (
          <button key={id} className={area === id ? "on" : ""} aria-current={area === id ? "page" : undefined} onClick={() => setArea(id)}>
            <Icon size={18} /> <span>{label}</span>
          </button>
        ))}
      </nav>

      {area === "cardapio" && <MenuTab onSignedOut={onSignedOut} />}
      {area === "crm" && <CrmTab onSignedOut={onSignedOut} />}
      {area === "promocoes" && <PromoTab onSignedOut={onSignedOut} />}
    </div>
  );
}
