import { connection } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { isStatus, listOrders, ordersConfigured, repeatOrder, setPayStatus, setStatus } from "@/lib/server/orders";
import type { OrderStatus } from "@/lib/orders";

/** Admin: every order of the last 12 months, newest first. */
export async function GET() {
  await connection();
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });
  if (!ordersConfigured()) return Response.json({ configured: false, orders: [] });
  try {
    return Response.json({ configured: true, orders: await listOrders(12) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível ler os pedidos. Confira a chave dos pedidos na Vercel." }, { status: 500 });
  }
}

/** Admin: moves an order to another status. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let body: { id?: unknown; status?: unknown; payStatus?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }
  const paying = body.payStatus === "pago" || body.payStatus === "pendente";
  if (typeof body.id !== "string" || (!paying && !isStatus(body.status))) return Response.json({ error: "dados inválidos" }, { status: 400 });
  try {
    const done = paying ? await setPayStatus(body.id, body.payStatus as "pago" | "pendente") : await setStatus(body.id, body.status as OrderStatus);
    return done ? Response.json({ ok: true }) : Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  } catch {
    return Response.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
}

/** Admin: repeats an old order as a new one. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });
  let body: { repeat?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }
  if (typeof body.repeat !== "string") return Response.json({ error: "dados inválidos" }, { status: 400 });
  try {
    const id = await repeatOrder(body.repeat);
    return id ? Response.json({ ok: true, id }) : Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  } catch {
    return Response.json({ error: "Não foi possível repetir o pedido. Tente de novo." }, { status: 500 });
  }
}