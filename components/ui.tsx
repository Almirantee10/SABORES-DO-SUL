"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { CupSoda, Minus, Package, Plus, ShoppingBag } from "lucide-react";
import { fmt } from "@/lib/data";
import { gsap, useGSAP, noMotion } from "@/lib/gsap";
import { Magnetic, Reveal } from "./Motion";

type BtnProps = {
  variant?: "primary" | "outline" | "ghost" | "whatsapp";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  magnetic?: boolean;
};

export function Button({ variant = "primary", size = "md", full, href, external, onClick, disabled, children, magnetic }: BtnProps) {
  const cls = `btn btn-${variant} btn-${size}${full ? " btn-full" : ""}`;
  let el: ReactNode;
  if (href && external) el = <a className={cls} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  else if (href) el = <Link className={cls} href={href}>{children}</Link>;
  else el = <button type="button" className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}

export const BagIcon = ({ size = 18 }: { size?: number }) => <ShoppingBag size={size} strokeWidth={2.2} />;

/** Round gold-ringed photo; products without a photo (drinks) get an icon instead. */
export function Thumb({ src, size, icon = 40, className = "" }: { src: string; size?: number; icon?: number; className?: string }) {
  const box = size ? { width: size, height: size } : {};
  if (src) return <div className={`ring ${className}`} style={{ ...box, backgroundImage: `url('${src}')` }} />;
  return (
    <div className={`ring ring-icon ${className}`} style={box}>
      <CupSoda size={icon} strokeWidth={1.6} />
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

export function PriceTag({ value, unit, framed, size = "md" }: { value: number; unit?: string; framed?: boolean; size?: "md" | "lg" }) {
  return (
    <span className={`price price-${size}${framed ? " price-framed" : ""}`}>
      {fmt(value)}
      {unit ? <small>/ {unit}</small> : null}
    </span>
  );
}

export function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="pill">
      <Package size={15} strokeWidth={2} />
      <b>{label}</b> {value}
    </span>
  );
}

/** Gold-ruled heading with diamond ornament; rules draw themselves on enter. */
export function SectionHeading({ children, kicker, align = "center" }: { children: ReactNode; kicker?: string; align?: "center" | "left" }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const rules = ref.current!.querySelectorAll(".rule");
    const dia = ref.current!.querySelector(".dia");
    const txt = ref.current!.querySelectorAll(".sh-txt");
    if (noMotion()) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top 88%", once: true } });
    tl.fromTo(rules, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "expo.out", transformOrigin: (i: number) => (i === 0 ? "right center" : "left center") }, 0)
      .fromTo(dia, { scale: 0, rotate: -180 }, { scale: 1, rotate: 0, duration: 0.9, ease: "back.out(2)" }, 0.1)
      .fromTo(txt, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, 0.15);
  }, { scope: ref });
  return (
    <div ref={ref} className={`sh sh-${align}`}>
      {kicker ? <div className="sh-txt eyebrow">{kicker}</div> : null}
      <div className="sh-row">
        {align === "center" && <i className="rule" />}
        <span className="sh-txt sh-title">{children}</span>
        <span className="dia">◆</span>
        <i className="rule" />
      </div>
    </div>
  );
}

export function ProductCard({ name, description, price, unit, image, badge, onOpen }: { name: string; description: string; price: number; unit: string; image: string; badge?: string; onOpen: () => void }) {
  return (
    <div className="pcard" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}>
      <div className="pcard-img"><div style={{ backgroundImage: `url('${image}')` }} /></div>
      <div className="pcard-body">
        <div className="pcard-name">{name}{badge ? <Badge>{badge}</Badge> : null}</div>
        <p>{description}</p>
        <div className="pcard-foot">
          <PriceTag value={price} unit={unit ? (unit === "meio cento" ? "meio cento" : unit) : undefined} />
          <span className="pcard-add" aria-label={`Adicionar ${name}`}><Plus size={16} strokeWidth={2.8} /> Adicionar</span>
        </div>
      </div>
    </div>
  );
}

/** Pill tabs with a gold indicator that glides between options. */
export function CategoryTabs({ items, value, onChange, variant = "pill" }: { items: { id: string; label: string }[]; value: string; onChange: (id: string) => void; variant?: "pill" | "bar" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const btn = wrap.current?.querySelector<HTMLElement>(`[data-id="${value}"]`);
    if (!btn || !ind.current) return;
    const props = { x: btn.offsetLeft, width: btn.offsetWidth };
    if (first.current || noMotion()) { gsap.set(ind.current, props); first.current = false; }
    else gsap.to(ind.current, { ...props, duration: 0.55, ease: "expo.out" });
    const sc = wrap.current!;
    if (sc.scrollWidth > sc.clientWidth) sc.scrollTo({ left: btn.offsetLeft - sc.clientWidth / 2 + btn.offsetWidth / 2, behavior: "smooth" });
  }, [value]);
  return (
    <div className={`tabs${variant === "bar" ? " tabs-underline" : ""}`} ref={wrap} role="tablist">
      <span className="tabs-ind" ref={ind} />
      {items.map((it) => (
        <button key={it.id} data-id={it.id} role="tab" aria-selected={it.id === value} className={it.id === value ? "on" : ""} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function QuantityStepper({ value, min = 1, step = 1, onChange, size = "md" }: { value: number; min?: number; step?: number; onChange: (v: number) => void; size?: "sm" | "md" }) {
  const num = useRef<HTMLSpanElement>(null);
  const bump = (dir: number) => {
    if (!noMotion()) gsap.fromTo(num.current, { y: dir * 10, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.35, ease: "expo.out" });
  };
  return (
    <div className={`stepper stepper-${size}`}>
      <button type="button" aria-label="Diminuir" disabled={value <= min} onClick={() => { onChange(Math.max(min, value - step)); bump(1); }}><Minus size={16} strokeWidth={2.6} /></button>
      <span ref={num}>{value}</span>
      <button type="button" aria-label="Aumentar" onClick={() => { onChange(value + step); bump(-1); }}><Plus size={16} strokeWidth={2.6} /></button>
    </div>
  );
}

export function Field({ label, icon, multiline, ...rest }: { label?: string; icon?: ReactNode; multiline?: boolean } & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const props = rest as Record<string, unknown>;
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <span className={`field-box${multiline ? " multi" : ""}`}>
        {icon}
        {multiline ? <textarea rows={3} {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} /> : <input {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />}
      </span>
    </label>
  );
}

export function OptionRow({ type, checked, disabled, label, description, meta, onChange }: { type: "radio" | "checkbox"; checked: boolean; disabled?: boolean; label: string; description?: string; meta?: string; onChange: () => void }) {
  return (
    <button type="button" className={`opt${checked ? " on" : ""}`} disabled={disabled} onClick={onChange} role={type} aria-checked={checked}>
      <span className={`opt-mark opt-${type}`}>{checked ? <i /> : null}</span>
      <span className="opt-txt"><b>{label}</b>{description ? <small>{description}</small> : null}</span>
      {meta ? <span className="opt-meta">{meta}</span> : null}
    </button>
  );
}

export { Reveal };
