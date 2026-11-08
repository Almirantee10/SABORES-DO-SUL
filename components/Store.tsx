"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PAY, fmt, fmtDate } from "@/lib/data";
import { useCatalog } from "./Catalog";

export type CartItem = {
  uid: string; pid: string; cat?: string; name: string; img: string; sizeLabel: string;
  price: number; qty: number; min: number; step: number; flavors: string[]; obs: string;
};
export type Sheet = { pid: string; size: string | null; flavors: string[]; qty: number; obs: string };
export type Checkout = { custName: string; phone: string; delivery: "retirada" | "entrega"; address: string; mapLink: string; date: string; time: string; pay: string | null; troco: string; obsGeral: string };

type Ctx = {
  cart: CartItem[];
  total: number;
  checkout: Checkout;
  setCheckout: (p: Partial<Checkout>) => void;
  patchItem: (uid: string, p: Partial<CartItem>) => void;
  removeItem: (uid: string) => void;
  clearCart: () => void;
  /** after the order is handed to WhatsApp: empties the cart and the order fields, keeps the name */
  finishOrder: () => void;
  sheet: Sheet | null;
  openSheet: (pid: string) => void;
  patchSheet: (fn: (s: Sheet) => Partial<Sheet>) => void;
  closeSheet: () => void;
  addToCart: () => void;
  addDirect: (s: Sheet) => void;
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
const EMPTY: Checkout = { custName: "", phone: "", delivery: "retirada", address: "", mapLink: "", date: "", time: "", pay: null, troco: "", obsGeral: "" };

export const burst = () => window.dispatchEvent(new CustomEvent("sds:burst"));

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkout, setCo] = useState<Checkout>(EMPTY);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const tt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { byId, open: shopOpen } = useCatalog();

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
    const p = byId[pid];
    if (!p || p.soldOut || !shopOpen) return;
    burst();
    setSheet({ pid, size: p.sizes ? p.sizes[0].id : null, flavors: [], qty: p.min || 1, obs: "" });
  }, [byId, shopOpen]);

  const patchSheet = useCallback((fn: (s: Sheet) => Partial<Sheet>) => {
    setSheet((s) => (s ? { ...s, ...fn(s) } : s));
  }, []);

  const addDirect = useCallback((s: Sheet) => {
    const p = byId[s.pid];
    if (!p) return;
    if (!shopOpen) { showToast("Estamos fechados no momento."); return; }
    if (p.soldOut) { showToast(p.name + " está esgotado."); return; }
    if (p.flavors && !s.flavors.length) return;
    const z = p.sizes?.find((x) => x.id === s.size) || null;
    const item: CartItem = {
      uid: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      pid: p.id, cat: p.cat, name: p.name, img: p.img,
      sizeLabel: z ? (z.id === "porcao" || z.id === "pacote" ? `${z.label} de ${z.sub.replace(" unidades", " un.")}` : z.label) : "",
      price: (z ? z.price : p.price) as number, qty: s.qty,
      min: z ? 1 : p.min || 1, step: z ? 1 : p.step || 1,
      flavors: s.flavors.slice(), obs: s.obs || "",
    };
    setCart((c) => c.concat([item]));
    burst();
    showToast(p.name + " adicionado ao pedido!");
  }, [showToast, byId, shopOpen]);

  const addToCart = useCallback(() => {
    if (!sheet) return;
    addDirect(sheet);
    setSheet(null);
  }, [sheet, addDirect]);

  const total = useMemo(() => cart.reduce((a, it) => a + it.qty * it.price, 0), [cart]);

  const buildMessage = useCallback(() => {
    const LINE = "────────────────────";
    const ICON: Record<string, string> = { fritos: "🍤", assados: "🥐", buffet: "🍔", bolos: "🍰", bebidas: "🥤" };
    const L = ["👤 *" + checkout.custName.trim() + "*", "📞 " + checkout.phone.trim(), "", LINE];
    cart.forEach((it) => {
      const cat = it.cat ?? byId[it.pid]?.cat ?? "";
      const base = it.name.replace(/^Salgados /, "");
      const title = base.charAt(0).toUpperCase() + base.slice(1);
      const icon = it.pid.startsWith("pq-") ? "🧀" : ICON[cat] ?? "🍴";
      L.push("", `${icon} *${title}${it.sizeLabel ? " · " + it.sizeLabel : ""}*`);
      it.flavors.forEach((f) => L.push("   • " + f));
      L.push(`   ${it.qty} × ${fmt(it.price)} = ${fmt(it.qty * it.price)}`);
      if (it.obs.trim()) L.push("   📝 Obs.: " + it.obs.trim());
    });
    L.push("", LINE, "💰 *Total estimado:* " + fmt(total), LINE, "");
    if (checkout.delivery === "entrega") {
      L.push("🚚 *Recebimento:* Entrega");
      L.push("📍 *Endereço / localização:* " + (checkout.address.trim() || (checkout.mapLink.trim() ? "ver link abaixo" : "enviarei pelo WhatsApp")));
      if (checkout.mapLink.trim()) L.push("🗺️ *Localização no mapa:* " + checkout.mapLink.trim());
    } else {
      L.push("🏪 *Recebimento:* Retirada no local");
    }
    L.push(`🗓️ *${checkout.delivery === "entrega" ? "Data da entrega" : "Data da retirada"}:* ${fmtDate(checkout.date)}`);
    L.push(`⏰ *${checkout.delivery === "entrega" ? "Horário da entrega" : "Horário da retirada"}:* ${checkout.time}`);
    const pay = PAY.find((x) => x.id === checkout.pay);
    L.push("💳 *Pagamento:* " + (pay ? pay.label : "-") + (checkout.pay === "dinheiro" && checkout.troco.trim() ? ` (troco para ${checkout.troco.trim()})` : ""));
    if (checkout.obsGeral.trim()) L.push("📝 *Observações:* " + checkout.obsGeral.trim());
    L.push("", "Aguardo a confirmação do valor final. Obrigado! 🙏");
    return L.join("\n");
  }, [cart, checkout, total, byId]);

  const value: Ctx = {
    cart, total, checkout, hydrated,
    setCheckout: (p) => setCo((c) => ({ ...c, ...p })),
    patchItem: (uid, p) => setCart((c) => c.map((it) => (it.uid === uid ? { ...it, ...p } : it))),
    removeItem: (uid) => setCart((c) => c.filter((x) => x.uid !== uid)),
    clearCart: () => setCart([]),
    finishOrder: () => {
      setCart([]);
      setCo((c) => ({ ...EMPTY, custName: c.custName, phone: c.phone }));
    },
    sheet, openSheet, patchSheet, closeSheet: () => setSheet(null), addToCart, addDirect,
    toast, showToast, sent, setSent, buildMessage,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
