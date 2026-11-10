import { clientIp, sameOrigin } from "@/lib/server/auth";
import { addOrder, ordersConfigured, sanitizeOrder } from "@/lib/server/orders";

/* a customer sends a handful of orders a day at most */
const seen = new Map<string, number[]>();
const tooMany = (ip: string) => {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter((t) => now - t < 3600_000);
  hits.push(now);
  seen.set(ip, hits);
  return hits.length > 15;
};

/** Public: the site records an order when the customer sends it to WhatsApp. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!ordersConfigured()) return Response.json({ error: "registro de pedidos não configurado" }, { status: 503 });
  if (tooMany(clientIp(req))) return Response.json({ error: "muitos pedidos" }, { status: 429 });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 40_000) return Response.json({ error: "pedido grande demais" }, { status: 413 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }
  const res = sanitizeOrder(body);
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 });

  try {
    return Response.json({ id: await addOrder(res.order) });
  } catch {
    return Response.json({ error: "não foi possível registrar" }, { status: 500 });
  }
}
