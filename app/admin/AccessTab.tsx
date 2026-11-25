"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/admin-client";

export function AccessTab({ user, onChanged, onSignedOut }: { user: string; onChanged: () => void; onSignedOut: () => void }) {
  const [cur, setCur] = useState("");
  const [name, setName] = useState(user);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setMsg({ ok: false, text: "A confirmação da senha não é igual à nova senha." });
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/credentials", "PUT", { current: cur, user: name, password: pw });
      setCur(""); setPw(""); setPw2("");
      setMsg({ ok: true, text: "Login alterado. Use o novo usuário e a nova senha na próxima vez. Outros aparelhos conectados foram desconectados." });
      onChanged();
    } catch (x) {
      if (x instanceof ApiError && x.status === 401) onSignedOut();
      else setMsg({ ok: false, text: x instanceof Error ? x.message : "Não foi possível alterar." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-pane">
      <p className="adm-note">Troque o usuário e a senha da área restrita. Anote a nova senha em um lugar seguro.</p>
      {msg && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}
      <form className="adm-card" onSubmit={submit}>
        <h2>Usuário e senha</h2>
        <label className="adm-f"><span>Senha atual</span><input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></label>
        <label className="adm-f"><span>Usuário</span><input autoComplete="username" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="adm-f"><span>Nova senha (mínimo 8 caracteres)</span><input type="password" autoComplete="new-password" value={pw} maxLength={100} onChange={(e) => setPw(e.target.value)} required /></label>
        <label className="adm-f"><span>Repita a nova senha</span><input type="password" autoComplete="new-password" value={pw2} maxLength={100} onChange={(e) => setPw2(e.target.value)} required /></label>
        <button className="btn btn-primary btn-md" disabled={busy || !cur || !name || pw.length < 8 || !pw2}>{busy ? "Salvando…" : "Salvar novo login"}</button>
      </form>
    </div>
  );
}
