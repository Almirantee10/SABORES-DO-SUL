import type { CartItem, Checkout } from "@/components/Store";

const BOX = "sds-outbox";

const read = (): unknown[] => {
  try { const v = JSON.parse(localStorage.getItem(BOX) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const write = (list: unknown[]) => { try { localStorage.setItem(BOX, JSON.stringify(list.slice(-5))); } catch {} };

/** true = saved (or refused for good: a retry would not help); false = try again later */
async function post(body: unknown): Promise<boolean> {
  try {
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "sds" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429);
  } catch {
    return false;
  }
}

/** Tells the shop's records about an order the customer is sending. A failure never blocks the WhatsApp message; an order that could not be saved is kept on the phone and sent again on the next visit. */
export async function recordOrder(cart: CartItem[], c: Checkout) {
  const body = {
    name: c.custName, phone: c.phone, delivery: c.delivery, address: c.address, mapLink: c.mapLink,
    date: c.date, time: c.time, pay: c.pay, troco: c.troco, notes: c.obsGeral,
    items: cart.map((i) => ({ pid: i.pid, name: i.name, size: i.sizeLabel, qty: i.qty, price: i.price, pct: i.pct ?? 0, flavors: i.flavors, extras: i.extras ?? [], orig: i.origPrice, obs: i.obs })),
  };
  if (await post(body)) return;
  await new Promise((r) => setTimeout(r, 2500));
  if (await post(body)) return;
  write([...read(), body]);
}

/** Sends again the orders that could not be saved before. */
export async function flushOutbox() {
  const list = read();
  if (!list.length) return;
  write([]);
  const failed: unknown[] = [];
  for (const b of list) if (!(await post(b))) failed.push(b);
  if (failed.length) write([...failed, ...read()]);
}
