"use client";

import { useRef } from "react";
import { gsap, useGSAP, noMotion } from "@/lib/gsap";

/** Eyebrow line + entrance of the other hero elements marked `.hero-fade`. */
export function HeroIntro({ label = "Salgados · Pães · Cucas — Palmas-TO", fade = ".hero-fade" }: { label?: string; fade?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const rest = Array.from(document.querySelectorAll<HTMLElement>(fade));
    if (noMotion()) { gsap.set([ref.current, ...rest], { opacity: 1 }); return; }
    gsap.fromTo(ref.current, { opacity: 0, y: 16, letterSpacing: "0.5em" }, { opacity: 1, y: 0, letterSpacing: "0.22em", duration: 1.6, delay: 0.5, ease: "expo.out" });
    gsap.fromTo(rest, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.14, delay: 1.0, ease: "expo.out" });
  }, { scope: ref });
  return <div ref={ref} className="eyebrow" style={{ opacity: 0 }}>{label}</div>;
}
