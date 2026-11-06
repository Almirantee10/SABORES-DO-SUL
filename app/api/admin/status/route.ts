import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { readStore, writeStore } from "@/lib/server/storage";

/** Admin: opens or closes the shop. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let body: { open?: unknown; closedMessage?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }
  if (typeof body.open !== "boolean") return Response.json({ error: "dados inválidos" }, { status: 400 });

  try {
    const current = await readStore();
    current.open = body.open;
    if (typeof body.closedMessage === "string") current.closedMessage = body.closedMessage.trim().slice(0, 200);
    current.updatedAt = Date.now();
    await writeStore(current);
    return Response.json({ open: current.open, closedMessage: current.closedMessage });
  } catch {
    return Response.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
}

