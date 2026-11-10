"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/data";
import { percentFor, promoState, todayStr, type Promo } from "@/lib/promo";
import { defaultStore, type StoreData } from "@/lib/store-data";

type Ctx = {
  products: Product[];
  promos: Promo[];
  /** promotions running today */
  activePromos: Promo[];
  /** running discount for a product, in percent (0 = none) */
  promoPct: (pid: string) => number;
  byId: Record<string, Product>;
  open: boolean;
  closedMessage: string;
  /** false until the live menu arrived (or failed), so nobody orders at an out-of-date price */
  ready: boolean;
  refresh: () => Promise<void>;
  apply: (d: Partial<StoreData>) => void;
};

const CatalogCtx = createContext<Ctx>(null as unknown as Ctx);
export const useCatalog = () => useContext(CatalogCtx);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoreData>(defaultStore);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("");
  const last = useRef(0);

  const refresh = useCallback(async () => {
    last.current = Date.now();
    try {
      const res = await fetch("/api/store", { cache: "no-store" });
      if (res.ok) {
        const d = (await res.json()) as StoreData;
        if (Array.isArray(d.products)) setData(d);
      }
    } catch {
      // keep the menu shipped with the site
    } finally {
      setToday(todayStr()); // the customer's own calendar decides which promotions are running
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the live menu after the first paint
    void refresh();
    const again = () => {
      if (document.visibilityState === "visible" && Date.now() - last.current > 20_000) void refresh();
    };
    document.addEventListener("visibilitychange", again);
    window.addEventListener("focus", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener("focus", again);
    };
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      products: data.products,
      promos: data.promos ?? [],
      activePromos: (data.promos ?? []).filter((p) => promoState(p, today) === "ativa"),
      promoPct: (pid: string) => percentFor(data.promos ?? [], pid, today),
      byId: Object.fromEntries(data.products.map((p) => [p.id, p])),
      open: data.open !== false,
      closedMessage: data.closedMessage || "",
      ready,
      refresh,
      apply: (d) => setData((cur) => ({ ...cur, ...d })),
    }),
    [data, ready, refresh, today],
  );

  return <CatalogCtx.Provider value={value}>{children}</CatalogCtx.Provider>;
}
