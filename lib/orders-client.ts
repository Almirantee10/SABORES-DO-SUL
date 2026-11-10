import type { CartItem, Checkout } from "@/components/Store";

/** Tells the shop's records about an order the customer is sending. A failure never blocks the WhatsApp message. */
export async function recordOrder(cart: CartItem[], c: Checkout) {
  try {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "sds" },
      body: JSON.stringify({
        name: c.custName, phone: c.phone, delivery: c.delivery, address: c.address, mapLink: c.mapLink,
        date: c.date, time: c.time, pay: c.pay, troco: c.troco, notes: c.obsGeral,
        items: cart.map((i) => ({ pid: i.pid, name: i.name, size: i.sizeLabel, qty: i.qty, price: i.price, pct: i.pct ?? 0, flavors: i.flavors, obs: i.obs })),
      }),
      keepalive: true,
    });
  } catch {
    // the order still goes out through WhatsApp
  }
}
