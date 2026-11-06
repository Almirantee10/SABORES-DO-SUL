"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { fmt, maxFlavors, type Product } from "@/lib/data";
import { gsap, noMotion } from "@/lib/gsap";
import { useStore } from "./Store";
import { useCatalog } from "./Catalog";
import { Badge, Field, OptionRow, QuantityStepper, Thumb } from "./ui";

/** A product with every choice (size, flavors, quantity) open on the card. */
export function ProductInline({ p }: { p: Product }) {
  const { addDirect } = useStore();
  const { open: shopOpen, ready } = useCatalog();
  const [size, setSize] = useState<string | null>(p.sizes ? p.sizes[0].id : null);
  const [flavors, setFlavors] = useState<string[]>([]);
  const [qty, setQty] = useState(p.min || 1);
  const [obs, setObs] = useState("");
  const btn = useRef<HTMLButtonElement>(null);

  // the menu can change while this card is on screen (price, sizes, flavors)
  const z = p.sizes?.find((x) => x.id === size) || p.sizes?.[0] || null;
  const unit = (z ? z.price : p.price) as number;
  const max = maxFlavors(p, z ? z.id : null);
  const single = p.pick === 1;
  const min = z ? 1 : p.min || 1;
  const step = z ? 1 : p.step || 1;
  const picked = flavors.filter((f) => p.flavors?.includes(f)).slice(0, max);
  const need = !!p.flavors && picked.length === 0;
  const blocked = !!p.soldOut || !shopOpen || !ready;

  const pickSize = (id: string) => {
    setSize(id);
    setFlavors((f) => f.slice(0, maxFlavors(p, id)));
  };
  const toggle = (f: string) =>
    setFlavors((cur) => (single ? [f] : cur.includes(f) ? cur.filter((x) => x !== f) : cur.length < max ? cur.concat([f]) : cur));

  const add = () => {
    if (need || blocked) return;
    addDirect({ pid: p.id, size: z ? z.id : null, flavors: picked, qty: Math.max(qty, min), obs: obs.trim() });
    setFlavors([]);
    setObs("");
    setQty(min);
    if (!noMotion() && btn.current) gsap.fromTo(btn.current, { scale: 0.96 }, { scale: 1, duration: 0.6, ease: "elastic.out(1,.5)" });
  };

  const hint = single ? "Escolha 1 sabor" : `Escolha até ${max} sabores (pode ser só 1)`;
  const count = single ? "Escolha 1" : `Escolha de 1 a ${max}`;
  const label = p.soldOut ? "Esgotado" : !shopOpen ? "Fechado no momento" : !ready ? "Carregando…" : `Adicionar ao pedido · ${fmt(unit * qty)}`;

  return (
    <article className={`pi${p.soldOut ? " is-soldout" : ""}`}>
      <header className="pi-head">
        <div className="pi-txt">
          <h3>{p.name}{p.badge ? <Badge>{p.badge}</Badge> : null}{p.soldOut ? <span className="soldout-tag">Esgotado</span> : null}</h3>
          <p>{p.desc}</p>
        </div>
        <Thumb src={p.img} icon={44} className="pi-ring" />
      </header>

      {p.sizes && (
        <div className="pi-sizes" role="radiogroup" aria-label="Tamanho">
          {p.sizes.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={z?.id === s.id} className={`pi-size${z?.id === s.id ? " on" : ""}`} onClick={() => pickSize(s.id)}>
              <small>{s.label}</small>
              <b>{fmt(s.price)}</b>
              <em>{s.sub.replace(/ · .*/, "")}</em>
            </button>
          ))}
        </div>
      )}

      {p.flavors && (
        <div className="pi-flavors">
          <div className="pi-hint"><span>{hint}</span><b>{count}</b></div>
          {p.flavors.map((f) => {
            const on = picked.includes(f);
            return <OptionRow key={f} type={single ? "radio" : "checkbox"} checked={on} disabled={!on && !single && picked.length >= max} label={f} onChange={() => toggle(f)} />;
          })}
        </div>
      )}

      <div className="pi-foot">
        {p.ask && <Field label={p.ask} placeholder="Ex.: uva, laranja, maracujá" value={obs} onChange={(e) => setObs(e.target.value)} />}
        <div className="pi-qty">
          <div><span className="lbl">Quantidade</span><small>{z ? (z.id === "cento" ? "Quantos centos" : z.id === "meio" ? "Quantos meios centos" : "Quantas porções") : p.min && p.min > 1 ? `Mínimo de ${p.min} unidades` : `${fmt(unit)} cada`}</small></div>
          <QuantityStepper value={qty} min={min} step={step} onChange={setQty} />
        </div>
        <button ref={btn} type="button" className="btn btn-primary btn-lg btn-full" disabled={need || blocked} onClick={add}>
          {!blocked && <Plus size={18} strokeWidth={2.6} />} <span>{label}</span>
        </button>
        {need && !blocked && <p className="warn">Escolha pelo menos 1 sabor para adicionar.</p>}
      </div>
    </article>
  );
}
