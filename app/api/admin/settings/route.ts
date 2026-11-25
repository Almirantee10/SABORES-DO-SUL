import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { readStore, writeStore } from "@/lib/server/storage";
import { sanitizeCats, sanitizeSettings } from "@/lib/server/validate";

/** Admin: saves the shop settings and/or the categories (send only the part that changed). */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let body: { settings?: unknown; cats?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }

  try {
    const current = await readStore();
    if (body.settings !== undefined) {
      const res = sanitizeSettings(body.settings);
      if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
      current.settings = res.settings;
    }
    if (body.cats !== undefined) {
      const res = sanitizeCats(body.cats, current.products);
      if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
      current.cats = res.cats;
    }
    current.updatedAt = Date.now();
    await writeStore(current);
    return Response.json({ settings: current.settings, cats: current.cats, updatedAt: current.updatedAt });
  } catch {
    return Response.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
}
