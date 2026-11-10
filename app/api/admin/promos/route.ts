import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { readStore, writeStore } from "@/lib/server/storage";
import { sanitizePromos } from "@/lib/server/validate";

/** Admin: replaces the list of promotions. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let body: { promos?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }
  const res = sanitizePromos(body.promos);
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 });

  try {
    const current = await readStore();
    current.promos = res.promos;
    current.updatedAt = Date.now();
    await writeStore(current);
    return Response.json({ promos: current.promos });
  } catch {
    return Response.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
}
