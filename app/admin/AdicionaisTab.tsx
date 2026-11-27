"use client";

import { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import type { ExtraGroup } from "@/lib/data";
import { api, ApiError } from "@/lib/admin-client";
import type { StoreData } from "@/lib/store-data";
import { useCatalog } from "@/components/Catalog";
import { ExtrasEditor } from "./MenuTab";

/** Shared groups of extras (molhos, acompanhamentos, adicionais) that can be linked to several products. */
export function AdicionaisTab({ onSignedOut }: { onSignedOut: () => void }) {
  const catalog = useCatalog();
  const [groups, setGroups] = useState<ExtraGroup[] | null>(null);
  const [saved, setSaved] = useState("");
  const [use, setUse] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api<StoreData>("/api/store", "GET");
        if (!live) return;
        setGroups(d.extras ?? []);
        setSaved(JSON.stringify(d.extras ?? []));
        const n: Record<string, number> = {};
        d.products.forEach((p) => (p.extraIds ?? []).forEach((id) => { n[id] = (n[id] ?? 0) + 1; }));
        setUse(n);
      } catch {
        if (live) setMsg({ ok: false, text: "Não foi possível carregar. Atualize a página." });
      }
    })();
    return () => { live = false; };
  }, []);

  const dirty = groups !== null && JSON.stringify(groups) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = async () => {
    if (!groups) return;
    if (groups.some((g) => !g.name.trim())) return setMsg({ ok: false, text: "Dê um nome a cada grupo." });
    if (groups.some((g) => !g.options.some((o) => o.name.trim()))) return setMsg({ ok: false, text: "Cada grupo precisa de ao menos uma opção com nome." });
    setSaving(true);
    setMsg(null);
    try {
      const d = await api<{ extras: ExtraGroup[]; updatedAt: number }>("/api/admin/extras", "PUT", { extras: groups });
      setGroups(d.extras);
      setSaved(JSON.stringify(d.extras));
      catalog.apply({ extras: d.extras, updatedAt: d.updatedAt });
      setMsg({ ok: true, text: "Adicionais salvos. O cardápio já está atualizado." });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      else setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-pane">
      <p className="adm-note">Crie grupos reutilizáveis (ex.: &ldquo;Molhos&rdquo;, &ldquo;Acompanhamentos&rdquo;, &ldquo;Extras do salgado&rdquo;) e ligue cada um aos produtos em <b>Produtos → Editar</b>. As opções com valor somam ao preço do item. Se um grupo é removido aqui, ele sai de todos os produtos.</p>
      {msg && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}
      {!groups ? (
        <p className="adm-note">Carregando…</p>
      ) : (
        <>
          {groups.length === 0 && <p className="adm-note">Nenhum grupo criado ainda.</p>}
          {groups.map((g) => (
            <section key={g.id} className="adm-card">
              <ExtrasEditor value={[g]} onChange={(next) => setGroups((cur) => (cur ?? []).flatMap((x) => (x.id === g.id ? next : [x])))} single />
              <p className="adm-note">Usado em {use[g.id] ?? 0} produto(s).</p>
            </section>
          ))}
          <div>
            <button className="btn btn-outline btn-md" disabled={groups.length >= 12} onClick={() => setGroups((cur) => [...(cur ?? []), { id: "x" + Date.now().toString(36), name: "", min: 0, max: 1, options: [{ id: "o1", name: "", price: 0 }] }])}>
              <Plus size={16} /> <span>Novo grupo</span>
            </button>
          </div>
        </>
      )}
      {dirty && (
        <div className="adm-save">
          <span>Alterações ainda não salvas</span>
          <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setGroups(JSON.parse(saved))}>Descartar</button>
          <button className="btn btn-primary btn-md" disabled={saving} onClick={save}><Save size={16} /> <span>{saving ? "Salvando…" : "Salvar adicionais"}</span></button>
        </div>
      )}
    </div>
  );
}
