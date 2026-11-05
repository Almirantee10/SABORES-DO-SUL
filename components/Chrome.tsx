"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import { BY_ID, PAGES, fmt, maxFlavors, waUrl, WA_LABEL } from "@/lib/data";
import { gsap, useGSAP, noMotion } from "@/lib/gsap";
import { useStore } from "./Store";
import { Logo, WhatsAppIcon } from "./Brand";
import { BagIcon, Button, Field, OptionRow, QuantityStepper } from "./ui";
import { ScrollBar } from "./Motion";

/* ------------------------------------------------------------------ Header */
export function Header() {
  const path = usePathname();
  const { cart } = useStore();
  const ref = useRef<HTMLElement>(null);
  const badge = useRef<HTMLSpanElement>(null);
  const count = cart.length;
  const prev = useRef(count);

  useEffect(() => {
    const el = ref.current!;
    const set = () => document.documentElement.style.setProperty("--hh", el.offsetHeight + "px");
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useGSAP(() => {
    if (noMotion()) return;
    gsap.from(ref.current, { yPercent: -100, duration: 1, ease: "expo.out", delay: 0.1 });
    gsap.from(".nav a", { y: -12, opacity: 0, duration: 0.8, stagger: 0.07, delay: 0.3, ease: "expo.out" });
  }, { scope: ref });

  useEffect(() => {
    if (count !== prev.current && badge.current && !noMotion()) {
      gsap.fromTo(badge.current, { scale: 0.4 }, { scale: 1, duration: 0.7, ease: "elastic.out(1.2,.4)" });
    }
    prev.current = count;
  }, [count]);

  const links = PAGES.map((p) => {
    const on = p.href === "/" ? path === "/" : path.startsWith(p.href);
    return <Link key={p.href} href={p.href} className={on ? "on" : ""}>{p.label}</Link>;
  });

  return (
    <header className="header" ref={ref}>
      <div className="header-in">
        <nav className="nav nav-l" aria-label="Principal">{links.slice(0, 2)}</nav>
        <Link href="/" className="logo-c" aria-label="Sabores do Sul — início"><Logo height={48} /></Link>
        <div className="hdr-right">
          <nav className="nav nav-r" aria-label="Secundário">{links.slice(2)}</nav>
          <Link href="/carrinho" className="cart-link" aria-label="Meu pedido">
            <BagIcon size={20} />
            <span className="lbl-t">Meu pedido</span>
            {count > 0 && <span className="iconbtn-badge" ref={badge}>{count}</span>}
          </Link>
        </div>
        <nav className="nav nav-all" aria-label="Menu">{links}</nav>
      </div>
      <ScrollBar />
    </header>
  );
}

/* ------------------------------------------------------------------ Footer */
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-in">
        <Logo tagline height={64} />
        <div className="footer-nav">
          {PAGES.map((p) => <Link key={p.href} href={p.href}>{p.label}</Link>)}
        </div>
        <div className="footer-tag">Qualidade e sabor<br />que fazem a diferença!</div>
      </div>
    </footer>
  );
}

/* --------------------------------------------------------------- Cart bar */
export function CartBar() {
  const path = usePathname();
  const { cart, total, sheet, sent } = useStore();
  const show = cart.length > 0 && path !== "/carrinho" && !sheet && !sent;
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!show || noMotion()) return;
    gsap.fromTo(ref.current, { y: 90, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.6)" });
  }, { dependencies: [show] });
  if (!show) return null;
  return (
    <>
      <div style={{ height: 88 }} />
      <div className="cartbar">
        <div ref={ref} className="cartbar-in">
          <Link href="/carrinho" className="btn btn-primary btn-lg btn-full">
            <BagIcon size={20} />
            <span className="cartbar-row">
              <span>Ver pedido · {cart.length} {cart.length === 1 ? "item" : "itens"}</span>
              <span>{fmt(total)}</span>
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Toast */
export function Toast() {
  const { toast } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [last, setLast] = useState("");
  if (toast && toast !== last) setLast(toast);
  useGSAP(() => {
    if (noMotion()) { gsap.set(ref.current, { opacity: toast ? 1 : 0 }); return; }
    if (toast) gsap.fromTo(ref.current, { y: 30, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "expo.out", overwrite: true });
    else gsap.to(ref.current, { y: 20, opacity: 0, duration: 0.35, overwrite: true });
  }, { dependencies: [toast] });
  return (
    <div className="toast-wrap" aria-live="polite">
      <div ref={ref} className="toast" style={{ opacity: 0 }}>
        <span className="toast-ic"><Check size={16} strokeWidth={3} /></span>
        <span style={{ flex: 1 }}>{last}</span>
        <Link href="/carrinho" className="toast-act">Ver pedido</Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ BottomSheet */
function BottomSheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const back = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (noMotion()) { onClose(); return; }
    gsap.to(back.current, { opacity: 0, duration: 0.3 });
    gsap.to(panel.current, { yPercent: 100, duration: 0.45, ease: "power3.in", onComplete: onClose });
  }, [onClose]);

  useGSAP(() => {
    if (noMotion()) return;
    gsap.fromTo(back.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo(panel.current, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: "expo.out" });
    gsap.from(".sheet-body > *", { y: 24, opacity: 0, duration: 0.7, stagger: 0.06, delay: 0.2, ease: "expo.out" });
  }, { scope: panel });

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [close]);

  return (
    <div className="sheet-root" role="dialog" aria-modal aria-label={title}>
      <div className="sheet-back" ref={back} onClick={close} />
      <div className="sheet" ref={panel}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="iconbtn" onClick={close} aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- ProductSheet */
export function ProductSheet() {
  const { sheet, patchSheet, closeSheet, addToCart } = useStore();
  if (!sheet) return null;
  const p = BY_ID[sheet.pid];
  const z = p.sizes?.find((x) => x.id === sheet.size) || null;
  const unitPrice = (z ? z.price : p.price) as number;
  const max = maxFlavors(p, sheet.size);
  const chosen = sheet.flavors;
  const single = p.pick === 1;
  const min = z ? 1 : p.min || 1;
  const step = z ? 1 : p.step || 1;
  const needFlavor = !!p.flavors && chosen.length === 0;
  const qtyHint = z ? "Quantos " + (z.id === "cento" ? "centos" : "meios centos") : p.min ? `Mínimo de ${p.min} unidades` : fmt(unitPrice) + " cada";

  return (
    <BottomSheet
      title={p.name}
      onClose={closeSheet}
      footer={
        <>
          {needFlavor && <p className="warn">Escolha pelo menos 1 sabor para adicionar.</p>}
          <Button size="lg" full disabled={needFlavor} onClick={addToCart}><Plus size={18} strokeWidth={2.6} /> <span>Adicionar · {fmt(unitPrice * sheet.qty)}</span></Button>
        </>
      }
    >
      <div className="sheet-intro">
        <div className="ring" style={{ backgroundImage: `url('${p.img}')`, width: 88, height: 88 }} />
        <p>{p.desc}</p>
      </div>
      {p.sizes && (
        <div className="grp">
          <span className="lbl">Tamanho</span>
          {p.sizes.map((x) => (
            <OptionRow key={x.id} type="radio" checked={x.id === sheet.size} label={x.label} description={x.sub} meta={fmt(x.price)}
              onChange={() => patchSheet((cur) => ({ size: x.id, flavors: cur.flavors.slice(0, maxFlavors(p, x.id)) }))} />
          ))}
        </div>
      )}
      {p.flavors && (
        <div className="grp">
          <div className="grp-h"><span className="lbl">{single ? "Sabor" : "Sabores"}</span><b>{single ? "Escolha 1" : `${chosen.length} de ${max}`}</b></div>
          {p.flavors.map((f) => {
            const on = chosen.includes(f);
            return (
              <OptionRow key={f} type={single ? "radio" : "checkbox"} checked={on} disabled={!on && !single && chosen.length >= max} label={f}
                onChange={() => patchSheet((cur) => ({ flavors: single ? [f] : cur.flavors.includes(f) ? cur.flavors.filter((x) => x !== f) : cur.flavors.length < max ? cur.flavors.concat([f]) : cur.flavors }))} />
            );
          })}
        </div>
      )}
      <div className="qty-row">
        <div><span className="lbl">Quantidade</span><small>{qtyHint}</small></div>
        <QuantityStepper value={sheet.qty} min={min} step={step} onChange={(v) => patchSheet(() => ({ qty: v }))} />
      </div>
      <Field label="Observação deste item (opcional)" multiline placeholder="Ex.: bem sequinhos, separar por sabor..." value={sheet.obs} onChange={(e) => patchSheet(() => ({ obs: e.target.value }))} />
    </BottomSheet>
  );
}

/* -------------------------------------------------------------- SentSheet */
export function SentSheet() {
  const { sent, setSent, showToast, finishOrder } = useStore();
  if (!sent) return null;
  const opened = () => {
    // the order is on its way to WhatsApp: start the next one with an empty cart
    finishOrder();
    showToast("Pedido enviado! Obrigado pela preferência.");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(sent); }
    catch {
      const ta = document.createElement("textarea"); ta.value = sent; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove();
    }
    showToast(`Mensagem copiada! Cole no WhatsApp ${WA_LABEL}.`);
  };
  return (
    <BottomSheet
      title="Pedido pronto"
      onClose={() => setSent(null)}
      footer={
        <>
          <a className="btn btn-whatsapp btn-lg btn-full" href={waUrl(sent)} target="_blank" rel="noopener noreferrer" onClick={opened}><WhatsAppIcon size={22} /> <span>Abrir WhatsApp</span></a>
          <Button variant="outline" size="lg" full onClick={copy}><Copy size={18} /> <span>Copiar mensagem</span></Button>
        </>
      }
    >
      <p className="sheet-p">Confira seu pedido e toque em <b>Abrir WhatsApp</b>. Se o WhatsApp não abrir, copie a mensagem e envie para {WA_LABEL}.</p>
      <pre className="sent-pre">{sent}</pre>
    </BottomSheet>
  );
}

/* --------------------------------------------------------------- Balloons */
const COLORS = ["#E6B22D", "#EFA62E", "#F6D77A", "#FBF6EE", "#C9921C"];

export function Balloons() {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fire = () => {
      if (noMotion() || !layer.current) return;
      const L = layer.current;
      const H = window.innerHeight;
      for (let i = 0; i < 11; i++) {
        const c = COLORS[i % COLORS.length];
        const s = 0.75 + Math.random() * 0.55;
        const el = document.createElement("div");
        el.style.cssText = `position:absolute;left:${4 + Math.random() * 88}%;bottom:-100px;width:${46 * s}px;height:${58 * s}px;`;
        el.innerHTML = `<div class="b-body" style="position:absolute;inset:0;border-radius:50% 50% 48% 48%/56% 56% 44% 44%;background:${c};box-shadow:inset -6px -9px 0 rgba(0,0,0,.14)"><i style="position:absolute;left:20%;top:15%;width:22%;height:28%;border-radius:50%;background:rgba(255,255,255,.55)"></i></div><i class="b-str" style="position:absolute;left:50%;top:100%;width:1px;height:46px;background:rgba(245,235,221,.45)"></i>`;
        L.appendChild(el);
        const rise = (42 + Math.random() * 38) / 100 * H;
        const dur = 1.1 + Math.random() * 0.8;
        const tl = gsap.timeline({ delay: Math.random() * 0.45, onComplete: () => el.remove() });
        tl.to(el, { y: -rise - 100, duration: dur, ease: "power2.out" }, 0)
          .to(el, { rotate: gsap.utils.random(-8, 8), duration: dur / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0)
          .add(() => {
            const r = el.getBoundingClientRect();
            const body = el.querySelector(".b-body") as HTMLElement;
            const str = el.querySelector(".b-str") as HTMLElement;
            gsap.to(body, { scale: 1.6, opacity: 0, duration: 0.25, ease: "power2.out" });
            gsap.to(str, { opacity: 0, duration: 0.2 });
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2, d = 34 + Math.random() * 26;
              const sh = document.createElement("i");
              sh.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height * 0.42}px;width:7px;height:7px;border-radius:2px;background:${c};`;
              L.appendChild(sh);
              gsap.to(sh, { x: Math.cos(a) * d, y: Math.sin(a) * d, rotate: 160, scale: 0.3, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => sh.remove() });
            }
          });
      }
    };
    window.addEventListener("sds:burst", fire);
    return () => window.removeEventListener("sds:burst", fire);
  }, []);
  return <div ref={layer} aria-hidden className="balloons" />;
}
