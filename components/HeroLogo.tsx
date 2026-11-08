"use client";

import { useRef } from "react";
import { gsap, useGSAP, noMotion } from "@/lib/gsap";

/* eslint-disable @next/next/no-img-element */
/** Brand seal for the empty top of the hero: pops in, then floats while a gold ring turns and a glint sweeps across. */
export function HeroLogo() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (noMotion()) { gsap.set(".hl-wrap", { opacity: 1 }); return; }
    gsap.fromTo(".hl-wrap", { opacity: 0, scale: 0.55, rotate: -14, y: 36 }, { opacity: 1, scale: 1, rotate: 0, y: 0, duration: 1.5, delay: 0.25, ease: "back.out(1.6)" });
    gsap.to(".hl-float", { y: -12, duration: 3.2, delay: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to(".hl-ring", { rotate: 360, duration: 24, ease: "none", repeat: -1 });
    gsap.fromTo(".hl-glint", { xPercent: -160 }, { xPercent: 260, duration: 1.5, ease: "power2.inOut", repeat: -1, repeatDelay: 3.8, delay: 2.2 });
  }, { scope: root });

  return (
    <div className="hero-logo-area" ref={root}>
      <div className="hl-float">
        <div className="hl-wrap" style={{ opacity: 0 }}>
          <i className="hl-ring" aria-hidden />
          <div className="hl-disc">
            <img src="/assets/logo/logo-badge-circle.png" alt="Sabores do Sul — Salgados, Pães, Cucas — Palmas-TO" />
            <i className="hl-glint" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
