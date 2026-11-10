import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { readStore, writeStore } from "@/lib/server/storage";
import { sanitizeStore } from "@/lib/server/validate";

/** Admin: replaces the menu (products, prices, photos, sold-out flags). */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }
  const res = sanitizeStore(body);
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 });

  // the open/closed switch has its own endpoint, so a stale screen cannot flip it by accident
  try {
    const current = await readStore();
    res.data.open = current.open;
    res.data.closedMessage = current.closedMessage;
    res.data.promos = current.promos;
    await writeStore(res.data);
  } catch {
    return Response.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
  return Response.json(res.data);
}

