"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, noMotion } from "@/lib/gsap";

type Div = { children?: ReactNode; className?: string; style?: CSSProperties };

/** Fade + rise when the block enters the viewport. */
export function Reveal({ children, className, style, delay = 0, y = 36 }: Div & { delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (noMotion()) { gsap.set(ref.current, { opacity: 1 }); return; }
    gsap.fromTo(ref.current, { opacity: 0, y }, {
      opacity: 1, y: 0, duration: 1, delay, ease: "expo.out", clearProps: "transform",
      scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
    });
  }, { scope: ref });
  return <div ref={ref} className={className} style={{ opacity: 0, ...style }}>{children}</div>;
}

/** Children rise one after another as the container enters the viewport. */
export function Stagger({ children, className, style, each = 0.09 }: Div & { each?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const kids = gsap.utils.toArray<HTMLElement>(ref.current!.children);
    if (noMotion()) { gsap.set(kids, { opacity: 1 }); return; }
    gsap.fromTo(kids, { opacity: 0, y: 44, scale: 0.97 }, {
      opacity: 1, y: 0, scale: 1, duration: 0.9, stagger: each, ease: "expo.out", clearProps: "transform",
      scrollTrigger: { trigger: ref.current, start: "top 86%", once: true },
    });
  }, { scope: ref });
  return (
    <div ref={ref} className={className} style={style} data-stagger>
      {children}
    </div>
  );
}

/** Headline revealed word by word through a mask. */
export function SplitWords({ text, className, style, delay = 0, trigger = "load" }: { text: string; className?: string; style?: CSSProperties; delay?: number; trigger?: "load" | "scroll" }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useGSAP(() => {
    const words = ref.current!.querySelectorAll<HTMLElement>(".w > span");
    if (noMotion()) { gsap.set(words, { opacity: 1 }); return; }
    gsap.fromTo(words, { yPercent: 115, rotate: 4, opacity: 1 }, {
      yPercent: 0, rotate: 0, opacity: 1, duration: 1.15, stagger: 0.07, delay, ease: "expo.out",
      scrollTrigger: trigger === "scroll" ? { trigger: ref.current, start: "top 88%", once: true } : undefined,
    });
  }, { scope: ref });
  return (
    <h1 ref={ref} className={className} style={style} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="w" aria-hidden style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: ".12em", marginBottom: "-.12em" }}>
          <span style={{ display: "inline-block", opacity: 0 }}>{w}&nbsp;</span>
        </span>
      ))}
    </h1>
  );
}

export function SplitWordsH2(props: { text: string; className?: string; style?: CSSProperties; delay?: number }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useGSAP(() => {
    const words = ref.current!.querySelectorAll<HTMLElement>(".w > span");
    if (noMotion()) { gsap.set(words, { opacity: 1 }); return; }
    gsap.fromTo(words, { yPercent: 115, opacity: 1 }, {
      yPercent: 0, opacity: 1, duration: 1.05, stagger: 0.05, ease: "expo.out",
      scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
    });
  }, { scope: ref });
  return (
    <h2 ref={ref} className={props.className} style={props.style} aria-label={props.text}>
      {props.text.split(" ").map((w, i) => (
        <span key={i} className="w" aria-hidden style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: ".12em", marginBottom: "-.12em" }}>
          <span style={{ display: "inline-block", opacity: 0 }}>{w}&nbsp;</span>
        </span>
      ))}
    </h2>
  );
}

/** Background layer that drifts slower than the page (parallax) with an optional slow zoom. */
export function ParallaxBg({ src, overlay, zoom = true, amount = 14, style }: { src: string; overlay?: string; zoom?: boolean; amount?: number; style?: CSSProperties }) {
  const wrap = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (noMotion()) return;
    gsap.fromTo(bg.current, { yPercent: -amount / 2 }, {
      yPercent: amount / 2, ease: "none",
      scrollTrigger: { trigger: wrap.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
    });
    if (zoom) gsap.fromTo(bg.current, { scale: 1.12 }, { scale: 1.22, duration: 22, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }, { scope: wrap });
  return (
    <div ref={wrap} style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <div ref={bg} style={{ position: "absolute", inset: "-10% 0", background: `url('${src}') center/cover`, willChange: "transform" }} />
      {overlay && <div style={{ position: "absolute", inset: 0, background: overlay }} />}
    </div>
  );
}

/** Endless ticker; its speed follows the scroll velocity. */
export function Marquee({ items }: { items: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (noMotion()) return;
    const tween = gsap.to(ref.current, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v = Math.min(Math.abs(self.getVelocity()) / 400, 5);
        gsap.to(tween, { timeScale: 1 + v, duration: 0.2, overwrite: true });
        gsap.to(tween, { timeScale: 1, duration: 1.2, delay: 0.2, overwrite: false });
      },
    });
  }, { scope: ref });
  const row = [...items, ...items];
  return (
    <div className="marquee">
      <div ref={ref} className="marquee-track">
        {[0, 1].map((k) => row.map((m, i) => (
          <span key={k + "-" + i} className="marquee-item" aria-hidden={k === 1}>{m}<i>◆</i></span>
        )))}
      </div>
    </div>
  );
}

/** Subtle 3D tilt that follows the pointer. */
export function Tilt({ children, className, style, max = 6, onClick }: Div & { max?: number; onClick?: () => void }) {
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (noMotion() || e.pointerType === "touch") return;
    const t = e.currentTarget;
    const r = t.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(t, { rotateY: px * max, rotateX: -py * max, y: -8, duration: 0.5, ease: "power3.out", transformPerspective: 900 });
  };
  const leave = (e: React.PointerEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, y: 0, duration: 0.8, ease: "elastic.out(1,.6)" });
  };
  return (
    <div className={className} style={style} onPointerMove={move} onPointerLeave={leave} onClick={onClick}>
      {children}
    </div>
  );
}

/** Pulls the element slightly toward the cursor. */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const move = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (noMotion() || e.pointerType === "touch") return;
    const t = e.currentTarget;
    const r = t.getBoundingClientRect();
    gsap.to(t, { x: (e.clientX - (r.left + r.width / 2)) * strength, y: (e.clientY - (r.top + r.height / 2)) * strength, duration: 0.4 });
  };
  const leave = (e: React.PointerEvent<HTMLSpanElement>) => {
    gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1,.5)" });
  };
  return (
    <span style={{ display: "inline-block" }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </span>
  );
}

/** Number that rolls to its new value. */
export function CountUp({ value, format = (n: number) => String(Math.round(n)), className, style }: { value: number; format?: (n: number) => string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const cur = useRef({ v: value });
  useGSAP(() => {
    if (noMotion()) { cur.current.v = value; if (ref.current) ref.current.textContent = format(value); return; }
    gsap.to(cur.current, {
      v: value, duration: 0.7, ease: "power3.out", overwrite: true,
      onUpdate: () => { if (ref.current) ref.current.textContent = format(cur.current.v); },
    });
  }, { dependencies: [value] });
  return <span ref={ref} className={className} style={style}>{format(value)}</span>;
}

/** A few gold embers drifting upward. Decorative and very quiet. */
export function Embers({ count = 16 }: { count?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (noMotion()) return;
    gsap.utils.toArray<HTMLElement>(".ember").forEach((el) => {
      const run = (first = false) => {
        const box = ref.current!.getBoundingClientRect();
        const d = gsap.utils.random(7, 13);
        const x0 = gsap.utils.random(0, box.width);
        gsap.set(el, { x: x0, y: box.height * 0.1, opacity: 0, scale: gsap.utils.random(0.4, 1.1) });
        gsap.timeline({ delay: first ? gsap.utils.random(0, 8) : 0, onComplete: () => run() })
          .to(el, { y: -box.height * gsap.utils.random(0.3, 0.7), x: x0 + gsap.utils.random(-60, 60), duration: d, ease: "none" }, 0)
          .to(el, { opacity: gsap.utils.random(0.3, 0.7), duration: d * 0.3 }, 0)
          .to(el, { opacity: 0, duration: d * 0.4 }, d * 0.6);
      };
      run(true);
    });
  }, { scope: ref });
  return (
    <div ref={ref} aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => <i key={i} className="ember" />)}
    </div>
  );
}

/** Scroll progress bar. */
export function ScrollBar() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.to(ref.current, {
      scaleX: 1, ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });
  });
  return <div ref={ref} className="scrollbar" />;
}
