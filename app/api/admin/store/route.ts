import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { readStore, writeStore } from "@/lib/server/storage";
import { sanitizeStore } from "@/lib/server/validate";

/** Admin: replaces the menu (products, prices, photos, sold-out flags, order of the items). */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }

  try {
    const current = await readStore();
    const res = sanitizeStore(body, current.cats.map((c) => c.id));
    if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
    // the other screens have their own endpoints, so a stale screen cannot undo their changes
    res.data.open = current.open;
    res.data.closedMessage = current.closedMessage;
    res.data.promos = current.promos;
    res.data.cats = current.cats;
    res.data.settings = current.settings;
    await writeStore(res.data);
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
}
