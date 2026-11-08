import { CATALOG, type Product } from "@/lib/data";

/** Everything the admin can change: the menu and whether the shop is taking orders. */
export type StoreData = {
  open: boolean;
  closedMessage: string;
  products: Product[];
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
  products: d.products.map((p) => (DESC_UPDATES[p.id]?.from === p.desc ? { ...p, desc: DESC_UPDATES[p.id].to } : p)),
});

export const defaultStore = (): StoreData => ({
  open: true,
  closedMessage: "",
  products: CATALOG,
  updatedAt: 0,
});
