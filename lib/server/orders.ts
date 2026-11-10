import { get, put } from "@vercel/blob";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PAY } from "@/lib/data";
import { STATUS, type Order, type OrderItem, type OrderStatus } from "@/lib/orders";

/*
 * Orders hold customer names, phones and addresses, and the Blob store is public,
 * so every month is saved as one AES-256-GCM encrypted file. Only the server key (ORDERS_KEY) opens it.
 * shortcut: one file per month, read whole on every change; fine for a bakery, move to a database past a few thousand orders a month.
 */

export const ordersConfigured = () => (process.env.ORDERS_KEY ?? "").length >= 16;
const key = () => createHash("sha256").update("sds-orders|" + process.env.ORDERS_KEY).digest();

function seal(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

function unseal(blob: string) {
  const [v, iv, tag, ct] = blob.trim().split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("formato de pedidos desconhecido");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const local = (k: string) => path.join(process.cwd(), ".data", `orders-${k}.dat`);

/** The shop is in Palmas (UTC-3, no daylight saving): months roll over at local midnight. */
const monthOf = (ms = Date.now()) => new Date(ms - 3 * 3600_000).toISOString().slice(0, 7);

/** A missing month is empty. Anything else that goes wrong throws, so a wrong key can never overwrite saved orders. */
async function readMonth(k: string): Promise<{ orders: Order[]; etag?: string }> {
  if (hasBlob()) {
    const r = await get(`orders/${k}.dat`, { access: "public", useCache: false });
    if (!r || r.statusCode !== 200) return { orders: [] };
    return { orders: JSON.parse(unseal(await new Response(r.stream).text())), etag: r.blob.etag };
  }
  try {
    return { orders: JSON.parse(unseal(await fs.readFile(local(k), "utf8"))) };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { orders: [] };
    throw e;
  }
}

async function writeMonth(k: string, orders: Order[], etag?: string) {
  const body = seal(JSON.stringify(orders));
  if (hasBlob()) {
    // with an etag only overwrite what we read; without one only create, so two writers cannot clobber each other
    await put(`orders/${k}.dat`, body, { access: "public", contentType: "text/plain", addRandomSuffix: false, cacheControlMaxAge: 60, ...(etag ? { ifMatch: etag } : { allowOverwrite: false }) });
    return;
  }
  if (process.env.NODE_ENV === "production") throw new Error("armazenamento não configurado");
  await fs.mkdir(path.dirname(local(k)), { recursive: true });
  await fs.writeFile(local(k), body, "utf8");
}

/** Read, change, write; if someone else wrote in between, try again. */
async function mutate(k: string, fn: (list: Order[]) => Order[] | null) {
  for (let i = 0; ; i++) {
    const { orders, etag } = await readMonth(k);
    const next = fn(orders);
    if (!next) return;
    try {
      return await writeMonth(k, next, etag);
    } catch (e) {
      if (i >= 4) throw e;
      await new Promise((r) => setTimeout(r, 150 * (i + 1) + Math.random() * 150));
    }
  }
}

export async function listOrders(months = 12): Promise<Order[]> {
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.now() - 3 * 3600_000);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    return d.toISOString().slice(0, 7);
  });
  const all = await Promise.all(keys.map((k) => readMonth(k).then((r) => r.orders)));
  return all.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type NewOrder = Omit<Order, "id" | "createdAt" | "status">;

/** Saves an order; the same order sent again within 6 hours returns the first one. */
export async function addOrder(base: NewOrder): Promise<string> {
  const k = monthOf();
  let id = "";
  await mutate(k, (list) => {
    const dup = list.find((o) => o.sig === base.sig && Date.now() - Date.parse(o.createdAt) < 6 * 3600_000);
    if (dup) {
      id = dup.id;
      return null;
    }
    id = `${k}-${randomBytes(3).toString("hex")}`;
    return [{ ...base, id, createdAt: new Date().toISOString(), status: "novo" }, ...list];
  });
  return id;
}

export async function setStatus(id: string, status: OrderStatus): Promise<boolean> {
  if (!/^\d{4}-\d{2}-[0-9a-f]{6}$/.test(id)) return false;
  let found = false;
  await mutate(id.slice(0, 7), (list) => {
    if (!list.some((o) => o.id === id)) return null;
    found = true;
    return list.map((o) => (o.id === id ? { ...o, status } : o));
  });
  return found;
}

/* --------------------------------------------------------------- validation */

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/** The order comes from the customer's browser: check every field and rebuild the total from the lines. */
export function sanitizeOrder(raw: unknown): { ok: true; order: NewOrder } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "pedido inválido" };
  const r = raw as Record<string, unknown>;
  const name = text(r.name, 80);
  const phone = text(r.phone, 20);
  if (!name || !/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) return { ok: false, error: "nome ou telefone inválido" };
  if (!Array.isArray(r.items) || !r.items.length || r.items.length > 60) return { ok: false, error: "itens inválidos" };

  const items: OrderItem[] = [];
  for (const it of r.items) {
    const i = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const qty = num(i.qty, 1, 5000);
    const price = num(i.price, 0, 99999);
    const pct = num(i.pct ?? 0, 0, 90);
    const itemName = text(i.name, 80);
    if (!itemName || qty === null || price === null || pct === null) return { ok: false, error: "item inválido" };
    items.push({
      pid: text(i.pid, 40),
      name: itemName,
      size: text(i.size, 60),
      qty: Math.round(qty),
      price: Math.round(price * 100) / 100,
      pct: Math.round(pct),
      flavors: Array.isArray(i.flavors) ? i.flavors.map((f) => text(f, 60)).filter(Boolean).slice(0, 20) : [],
      obs: text(i.obs, 200),
    });
  }

  const date = text(r.date, 10);
  const time = text(r.time, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "data ou horário inválido" };
  const mapLink = text(r.mapLink, 300);
  if (mapLink && !/^https:\/\//.test(mapLink)) return { ok: false, error: "link do mapa inválido" };
  const pay = text(r.pay, 20);
  if (!PAY.some((p) => p.id === pay)) return { ok: false, error: "pagamento inválido" };

  const total = Math.round(items.reduce((a, i) => a + i.qty * i.price, 0) * 100) / 100;
  const order: NewOrder = {
    name, phone,
    delivery: r.delivery === "entrega" ? "entrega" : "retirada",
    address: text(r.address, 200), mapLink, date, time, pay,
    troco: text(r.troco, 30), notes: text(r.notes, 300), items, total,
  };
  order.sig = createHash("sha256").update(JSON.stringify([order.phone.replace(/\D/g, ""), order.items, order.date, order.time, order.delivery, order.address, order.pay])).digest("hex").slice(0, 24);
  return { ok: true, order };
}

export const isStatus = (v: unknown): v is OrderStatus => STATUS.some((s) => s.id === v);
