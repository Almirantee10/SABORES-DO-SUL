import { PAY } from "@/lib/data";
import type { Order, OrderItem } from "@/lib/orders";
import { num, text } from "@/lib/server/orders";

/** Admin edit of an order: checks every field again and rebuilds the total from the lines and the fee. */
export function sanitizeEdit(raw: unknown): { ok: true; patch: Partial<Order> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "dados inválidos" };
  const r = raw as Record<string, unknown>;
  const name = text(r.name, 80);
  if (!name) return { ok: false, error: "informe o nome do cliente" };
  const phone = text(r.phone, 20);
  const pd = phone.replace(/\D/g, "");
  if (pd && !/^\d{10,11}$/.test(pd)) return { ok: false, error: "telefone inválido (use DDD e número)" };
  if (!Array.isArray(r.items) || !r.items.length || r.items.length > 60) return { ok: false, error: "o pedido precisa de ao menos 1 item" };

  const items: OrderItem[] = [];
  for (const it of r.items) {
    const i = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const itemName = text(i.name, 80);
    const qty = num(i.qty, 1, 5000);
    const price = num(i.price, 0, 99999);
    if (!itemName || qty === null || price === null) return { ok: false, error: "confira nome, quantidade e valor de cada item" };
    const orig = num(i.orig, 0, 99999);
    const extras = Array.isArray(i.extras)
      ? i.extras.slice(0, 20).map((e) => { const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>; return { name: text(o.name, 60), price: num(o.price, 0, 9999) ?? 0 }; }).filter((e) => e.name)
      : [];
    items.push({
      pid: text(i.pid, 40), name: itemName, size: text(i.size, 60), qty: Math.round(qty), price: Math.round(price * 100) / 100,
      pct: Math.round(num(i.pct ?? 0, 0, 90) ?? 0),
      flavors: Array.isArray(i.flavors) ? i.flavors.map((f) => text(f, 60)).filter(Boolean).slice(0, 20) : [],
      extras, ...(orig !== null && orig > price ? { orig: Math.round(orig * 100) / 100 } : {}), obs: text(i.obs, 200),
    });
  }

  const date = text(r.date, 10), time = text(r.time, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "data ou horário inválido" };
  const mapLink = text(r.mapLink, 300);
  if (mapLink && !/^https:\/\//.test(mapLink)) return { ok: false, error: "link do mapa inválido" };
  const pay = text(r.pay, 20);
  if (!PAY.some((p) => p.id === pay)) return { ok: false, error: "forma de pagamento inválida" };
  const fee = num(r.fee ?? 0, 0, 999);
  if (fee === null) return { ok: false, error: "taxa de entrega inválida" };

  const discount = num(r.discount ?? 0, 0, 99999);
  if (discount === null) return { ok: false, error: "desconto inválido" };
  const total = Math.max(0, Math.round((items.reduce((a, i) => a + i.qty * i.price, 0) + fee - discount) * 100) / 100);
  return {
    ok: true,
    patch: {
      name, phone, delivery: r.delivery === "entrega" ? "entrega" : "retirada", address: text(r.address, 200), mapLink, date, time, pay,
      troco: text(r.troco, 30), notes: text(r.notes, 300), items, fee, discount, total,
      payStatus: r.payStatus === "pago" ? "pago" : "pendente",
    },
  };
}
