"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { fmt } from "@/lib/data";
import { promoPrice } from "@/lib/promo";
import { useCatalog } from "./Catalog";
import { Thumb } from "./ui";

/** "Destaques": the products the owner starred, plus any product in a running promotion. Nothing is drawn when there are none. */
export function FeaturedStrip() {
  const { products, promoPct } = useCatalog();
  const list = products.filter((p) => !p.soldOut && (p.featured || promoPct(p.id) > 0));
  if (!list.length) return null;
  return (
    <section className="feat" aria-label="Destaques">
      <h2><Sparkles size={18} /> Destaques</h2>
      <div className="feat-row">
        {list.map((p) => {
          const pct = promoPct(p.id);
          const base = p.sizes ? Math.min(...p.sizes.map((s) => s.price)) : (p.price ?? 0);
          const price = promoPrice(base, pct);
          return (
            <Link key={p.id} href={`/cardapio#${p.cat}`} className="feat-card">
              <Thumb src={p.img} size={84} icon={30} className="feat-img" />
              <b>{p.name}</b>
              {pct > 0 && <span className="promo-tag">-{pct}%</span>}
              <span className="feat-price">
                {p.sizes && p.sizes.length > 1 ? <small>a partir de </small> : null}
                {pct > 0 ? <s>{fmt(base)}</s> : null} {fmt(price)}
              </span>
              <em>Pedir</em>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
