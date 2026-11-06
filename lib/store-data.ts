import { CATALOG, type Product } from "@/lib/data";

/** Everything the admin can change: the menu and whether the shop is taking orders. */
export type StoreData = {
  open: boolean;
  closedMessage: string;
  products: Product[];
  updatedAt: number;
};

export const defaultStore = (): StoreData => ({
  open: true,
  closedMessage: "",
  products: CATALOG,
  updatedAt: 0,
});
