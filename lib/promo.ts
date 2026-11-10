/** A discount the shop runs for a period on chosen products. */
export type Promo = {
  id: string;
  name: string;
  desc: string;
  percent: number;
  productIds: string[];
  /** first and last day, "YYYY-MM-DD", both included */
  start: string;
  end: string;
  active: boolean;
};

export type PromoState = "ativa" | "agendada" | "encerrada" | "pausada";

const pad = (n: number) => String(n).padStart(2, "0");
/** today in the browser's own calendar, as "YYYY-MM-DD" */
export const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};

export const promoState = (p: Promo, today: string): PromoState =>
  !p.active ? "pausada" : today < p.start ? "agendada" : today > p.end ? "encerrada" : "ativa";

/** Biggest running discount for a product (0 when none). */
export const percentFor = (promos: Promo[], pid: string, today: string) =>
  promos.reduce((m, p) => (promoState(p, today) === "ativa" && p.productIds.includes(pid) ? Math.max(m, p.percent) : m), 0);

export const promoPrice = (price: number, pct: number) => (pct > 0 ? Math.round(price * (100 - pct)) / 100 : price);
