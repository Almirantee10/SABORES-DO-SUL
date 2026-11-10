import { CATALOG, type Product } from "@/lib/data";
import type { Promo } from "@/lib/promo";

/** Everything the admin can change: the menu, the promotions and whether the shop is taking orders. */
export type StoreData = {
  open: boolean;
  closedMessage: string;
  products: Product[];
  promos: Promo[];
  updatedAt: number;
};

/**
 * Description updates for a menu that was already saved from the admin panel.
 * A description is replaced only while it still holds the old original text, so anything the admin typed is kept.
 */
const DESC_UPDATES: Record<string, { from: string; to: string }> = Object.fromEntries(
  CATALOG.filter((p) => p.descWas).map((p) => [p.id, { from: p.descWas as string, to: p.desc }]),
);

export const withDescUpdates = (d: StoreData): StoreData => ({
  ...d,
  promos: Array.isArray(d.promos) ? d.promos : [], // menus saved before promotions existed
  products: d.products.map((p) => (DESC_UPDATES[p.id]?.from === p.desc ? { ...p, desc: DESC_UPDATES[p.id].to } : p)),
});

export const defaultStore = (): StoreData => ({
  open: true,
  closedMessage: "",
  products: CATALOG,
  promos: [],
  updatedAt: 0,
});
