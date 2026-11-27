"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useStore } from "./Store";
import { useCatalog } from "./Catalog";

/** "Repetir meu último pedido": offered while the cart is empty, using this phone's last sent order and today's prices. */
export function RepeatLast() {
  const { cart, lastOrder, repeatLast, showToast, hydrated } = useStore();
  const { open, ready } = useCatalog();
  const router = useRouter();
  if (!hydrated || !ready || !lastOrder || cart.length > 0 || !open) return null;
  const go = () => {
    const n = repeatLast();
    if (n === 0) showToast("Esses produtos não estão disponíveis agora.");
    else router.push("/carrinho");
  };
  return (
    <button type="button" className="btn btn-outline btn-md repeat-last" onClick={go}>
      <RotateCcw size={16} /> <span>Repetir meu último pedido ({lastOrder.count} {lastOrder.count === 1 ? "item" : "itens"})</span>
    </button>
  );
}
