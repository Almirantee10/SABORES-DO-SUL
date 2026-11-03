"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BY_ID, PAY, fmt } from "@/lib/data";

export type CartItem = {
  uid: string; pid: string; name: string; img: string; sizeLabel: string;
  price: number; qty: number; min: number; step: number; flavors: string[]; obs: string;
};
export type Sheet = { pid: string; size: string | null; flavors: string[]; qty: number; obs: string };
export type Checkout = { custName: string; delivery: "retirada" | "entrega"; address: string; pay: string | null; troco: string; obsGeral: string };

type Ctx = {
  cart: CartItem[];
  total: number;
  checkout: Checkout;
  setCheckout: (p: Partial<Checkout>) => void;
  patchItem: (uid: string, p: Partial<CartItem>) => void;
  removeItem: (uid: string) => void;
  clearCart: () => void;
  sheet: Sheet | null;
  openSheet: (pid: string) => void;
  patchSheet: (fn: (s: Sheet) => Partial<Sheet>) => void;
  closeSheet: () => void;
  addToCart: () => void;
  toast: string | null;
  showToast: (t: string) => void;
  sent: string | null;
  setSent: (t: string | null) => void;
  buildMessage: () => string;
  hydrated: boolean;
};

const StoreCtx = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(StoreCtx);

const LS = "sds-pedido-next-v1";
const EMPTY: Checkout = { custName: "", delivery: "retirada", address: "", pay: null, troco: "", obsGeral: "" };

export const burst = () => window.dispatchEvent(new CustomEvent("sds:burst"));

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkout, setCo] = useState<Checkout>(EMPTY);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const tt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restoring the saved cart after hydration */
    try {
      const s = JSON.parse(localStorage.getItem(LS) || "null");
      if (s && Array.isArray(s.cart)) {
        setCart(s.cart);
        setCo({ ...EMPTY, ...s.checkout });
      }
    } catch {}
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(LS, JSON.stringify({ cart, checkout })); } catch {}
  }, [cart, checkout, hydrated]);

  const showToast = useCallback((t: string) => {
    clearTimeout(tt.current);
    setToast(t);
    tt.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const openSheet = useCallback((pid: string) => {
    const p = BY_ID[pid];
    burst();
    setSheet({ pid, size: p.sizes ? p.sizes[0].id : null, flavors: [], qty: p.min || 1, obs: "" });
  }, []);

  const patchSheet = useCallback((fn: (s: Sheet) => Partial<Sheet>) => {
    setSheet((s) => (s ? { ...s, ...fn(s) } : s));
  }, []);

  const addToCart = useCallback(() => {
    if (!sheet) return;
    const p = BY_ID[sheet.pid];
    if (p.flavors && !sheet.flavors.length) return;
    const z = p.sizes?.find((x) => x.id === sheet.size) || null;
    const item: CartItem = {
      uid: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      pid: p.id, name: p.name, img: p.img, sizeLabel: z ? z.label : "",
      price: (z ? z.price : p.price) as number, qty: sheet.qty,
      min: z ? 1 : p.min || 1, step: z ? 1 : p.step || 1,
      flavors: sheet.flavors.slice(), obs: sheet.obs || "",
    };
    setCart((c) => c.concat([item]));
    setSheet(null);
    burst();
    showToast(p.name + " adicionado ao pedido!");
  }, [sheet, showToast]);

  const total = useMemo(() => cart.reduce((a, it) => a + it.qty * it.price, 0), [cart]);

  const buildMessage = useCallback(() => {
    const L = ["*PEDIDO — SABORES DO SUL*"];
    if (checkout.custName.trim()) L.push("*Cliente:* " + checkout.custName.trim());
    L.push("", "*ITENS*");
    cart.forEach((it, i) => {
      const q = it.sizeLabel ? `${it.qty}x ${it.sizeLabel}` : `${it.qty} un.`;
      L.push(`${i + 1}. ${it.name} — ${q} — ${fmt(it.qty * it.price)}`);
      it.flavors.forEach((f) => L.push("    - " + f));
      if (it.obs.trim()) L.push("    Obs.: " + it.obs.trim());
    });
    L.push("", "*Total:* " + fmt(total));
    L.push("*Recebimento:* " + (checkout.delivery === "entrega" ? "Entrega" : "Retirada no local"));
    if (checkout.delivery === "entrega") L.push("*Endereço:* " + (checkout.address.trim() || "a combinar"));
    const pay = PAY.find((x) => x.id === checkout.pay);
    L.push("*Pagamento:* " + (pay ? pay.label : "-") + (checkout.pay === "dinheiro" && checkout.troco.trim() ? ` (troco para ${checkout.troco.trim()})` : ""));
    if (checkout.obsGeral.trim()) L.push("*Observações:* " + checkout.obsGeral.trim());
    return L.join("\n");
  }, [cart, checkout, total]);

  const value: Ctx = {
    cart, total, checkout, hydrated,
    setCheckout: (p) => setCo((c) => ({ ...c, ...p })),
    patchItem: (uid, p) => setCart((c) => c.map((it) => (it.uid === uid ? { ...it, ...p } : it))),
    removeItem: (uid) => setCart((c) => c.filter((x) => x.uid !== uid)),
    clearCart: () => setCart([]),
    sheet, openSheet, patchSheet, closeSheet: () => setSheet(null), addToCart,
    toast, showToast, sent, setSent, buildMessage,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
