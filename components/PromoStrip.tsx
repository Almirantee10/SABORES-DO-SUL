"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import { useCatalog } from "./Catalog";

/** Running promotions, shown as a gold strip. Nothing is drawn when there are none. */
export function PromoStrip({ link = true }: { link?: boolean }) {
  const { activePromos } = useCatalog();
  if (!activePromos.length) return null;
  return (
    <div className="promo-strip" role="region" aria-label="Promoções">
      {activePromos.map((p) => (
        <div key={p.id} className="promo-item">
          <Tag size={18} />
          <div>
            <b>{p.name} · {p.percent}% OFF</b>
            {p.desc ? <span>{p.desc}</span> : null}
          </div>
        </div>
      ))}
      {link && <Link href="/cardapio" className="promo-go">Ver no cardápio</Link>}
    </div>
  );
}
