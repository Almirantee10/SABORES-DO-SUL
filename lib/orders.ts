import { fmt, fmtDate } from "@/lib/data";

export type OrderStatus = "novo" | "preparo" | "pronto" | "concluido" | "cancelado";

export const STATUS: { id: OrderStatus; label: string }[] = [
  { id: "novo", label: "Novo" },
  { id: "preparo", label: "Em preparo" },
  { id: "pronto", label: "Pronto" },
  { id: "concluido", label: "Concluído" },
  { id: "cancelado", label: "Cancelado" },
];
export const statusLabel = (s: string) => STATUS.find((x) => x.id === s)?.label ?? s;
export const payLabel = (p: string) => ({ pix: "Pix", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro" } as Record<string, string>)[p] ?? p;

export type OrderItem = {
  pid: string;
  name: string;
  size: string;
  qty: number;
  price: number;
  /** promotion discount applied to this line, in percent (0 = none) */
  pct: number;
  flavors: string[];
  obs: string;
};

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  name: string;
  phone: string;
  delivery: "retirada" | "entrega";
  address: string;
  mapLink: string;
  date: string;
  time: string;
  pay: string;
  troco: string;
  notes: string;
  items: OrderItem[];
  total: number;
  /** fingerprint used to ignore the same order sent twice */
  sig?: string;
};

/* ---------------------------------------------------------------- analytics */

const day = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const orderDay = day;
const digits = (s: string) => s.replace(/\D/g, "");
/** cancelled orders do not count as sales */
export const counts = (o: Order) => o.status !== "cancelado";

export function summary(orders: Order[]) {
  const live = orders.filter(counts);
  const revenue = live.reduce((a, o) => a + o.total, 0);
  return {
    orders: live.length,
    revenue,
    ticket: live.length ? revenue / live.length : 0,
    customers: new Set(live.map((o) => digits(o.phone))).size,
    units: live.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0),
    cancelled: orders.length - live.length,
  };
}

/** One bar per day from `from` to `to` (both "YYYY-MM-DD"), including days with no sales. */
export function byDay(orders: Order[], from: string, to: string) {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders.filter(counts)) {
    const k = day(o.createdAt);
    const cur = map.get(k) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    map.set(k, cur);
  }
  const out: { day: string; revenue: number; orders: number }[] = [];
  for (let d = new Date(from + "T12:00:00"); day(d.toISOString()) <= to && out.length < 400; d.setDate(d.getDate() + 1)) {
    const k = day(d.toISOString());
    out.push({ day: k, ...(map.get(k) ?? { revenue: 0, orders: 0 }) });
  }
  return out;
}

export type ItemStat = { name: string; qty: number; revenue: number; orders: number };
export function byItem(orders: Order[]): ItemStat[] {
  const m = new Map<string, ItemStat>();
  for (const o of orders.filter(counts))
    for (const i of o.items) {
      const cur = m.get(i.name) ?? { name: i.name, qty: 0, revenue: 0, orders: 0 };
      cur.qty += i.qty;
      cur.revenue += i.qty * i.price;
      cur.orders += 1;
      m.set(i.name, cur);
    }
  return [...m.values()].sort((a, b) => b.revenue - a.revenue);
}

export type CustomerStat = { key: string; name: string; phone: string; orders: number; total: number; ticket: number; first: string; last: string; items: ItemStat[] };
export function byCustomer(orders: Order[]): CustomerStat[] {
  const m = new Map<string, Order[]>();
  for (const o of orders.filter(counts)) m.set(digits(o.phone), [...(m.get(digits(o.phone)) ?? []), o]);
  return [...m.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const total = list.reduce((a, o) => a + o.total, 0);
      return {
        key,
        name: sorted[sorted.length - 1].name,
        phone: sorted[sorted.length - 1].phone,
        orders: list.length,
        total,
        ticket: total / list.length,
        first: sorted[0].createdAt,
        last: sorted[sorted.length - 1].createdAt,
        items: byItem(list),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function tally<T extends string>(orders: Order[], pick: (o: Order) => T) {
  const m = new Map<T, number>();
  for (const o of orders.filter(counts)) m.set(pick(o), (m.get(pick(o)) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/* ------------------------------------------------------------------- export */

const money = (n: number) => n.toFixed(2).replace(".", ",");
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR");
const itemText = (o: Order) => o.items.map((i) => `${i.qty}x ${i.name}${i.size ? " (" + i.size + ")" : ""}${i.flavors.length ? " [" + i.flavors.join(", ") + "]" : ""}`).join(" | ");

export const CSV = {
  pedidos: (orders: Order[]) => [
    ["Pedido", "Feito em", "Situação", "Cliente", "Telefone", "Recebimento", "Data", "Horário", "Endereço", "Mapa", "Pagamento", "Itens", "Total (R$)"],
    ...orders.map((o) => [o.id, when(o.createdAt), statusLabel(o.status), o.name, o.phone, o.delivery === "entrega" ? "Entrega" : "Retirada", fmtDate(o.date), o.time, o.address, o.mapLink, payLabel(o.pay), itemText(o), money(o.total)]),
  ],
  linhas: (orders: Order[]) => [
    ["Pedido", "Feito em", "Situação", "Cliente", "Telefone", "Item", "Tamanho", "Sabores", "Quantidade", "Valor unitário (R$)", "Promoção (%)", "Subtotal (R$)"],
    ...orders.flatMap((o) => o.items.map((i) => [o.id, when(o.createdAt), statusLabel(o.status), o.name, o.phone, i.name, i.size, i.flavors.join(", "), i.qty, money(i.price), i.pct || "", money(i.qty * i.price)])),
  ],
  clientes: (list: CustomerStat[]) => [
    ["Cliente", "Telefone", "Pedidos", "Total gasto (R$)", "Ticket médio (R$)", "Primeiro pedido", "Último pedido", "Itens mais pedidos"],
    ...list.map((c) => [c.name, c.phone, c.orders, money(c.total), money(c.ticket), when(c.first), when(c.last), c.items.slice(0, 5).map((i) => `${i.qty}x ${i.name}`).join(" | ")]),
  ],
  itens: (list: ItemStat[]) => [
    ["Item", "Unidades vendidas", "Pedidos", "Faturamento (R$)"],
    ...list.map((i) => [i.name, i.qty, i.orders, money(i.revenue)]),
  ],
};

/** Semicolon + BOM so Excel (pt-BR) and Google Sheets open accents and columns correctly. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    // cells starting with = + - @ would run as formulas in a spreadsheet
    const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s.replace(",", "."))) ? "'" + s : s;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const text = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export { fmt };
