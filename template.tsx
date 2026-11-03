"use client";

import { useRef } from "react";
import { gsap, useGSAP, noMotion } from "@/lib/gsap";

/** Re-mounts on every navigation: a soft fade-in and a gold curtain wipe. */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    window.scrollTo(0, 0);
    if (noMotion()) return;
    gsap.fromTo(ref.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", clearProps: "transform,opacity" });
    gsap.fromTo(wipe.current, { scaleY: 1 }, { scaleY: 0, duration: 0.9, ease: "expo.inOut", transformOrigin: "top center", onComplete: () => { gsap.set(wipe.current, { display: "none" }); } });
  }, { scope: ref });
  return (
    <>
      <div ref={wipe} className="wipe" aria-hidden />
      <div ref={ref}>{children}</div>
    </>
  );
}
