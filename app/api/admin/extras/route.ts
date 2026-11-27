import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { readStore, writeStore } from "@/lib/server/storage";
import { sanitizeExtras } from "@/lib/server/validate";

/** Admin: saves the shared groups of extras (Adicionais tab). Products that pointed to a removed group lose the link. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let body: { extras?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }
  const res = sanitizeExtras(body.extras);
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 });

  try {
    const current = await readStore();
    const known = new Set(res.extras.map((g) => g.id));
    current.extras = res.extras;
    current.products = current.products.map((p) => {
      if (!p.extraIds) return p;
      const ids = p.extraIds.filter((id) => known.has(id));
      const { extraIds: _x, ...rest } = p;
      void _x;
      return ids.length ? { ...rest, extraIds: ids } : rest;
    });
    current.updatedAt = Date.now();
    await writeStore(current);
    return Response.json({ extras: current.extras, updatedAt: current.updatedAt });
  } catch {
    return Response.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
}
