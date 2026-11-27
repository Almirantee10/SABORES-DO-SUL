"use client";

import { useEffect, useRef, useState } from "react";
import { useCatalog } from "@/components/Catalog";
import { ShopStatus } from "@/components/ShopStatus";
import { PromoStrip } from "@/components/PromoStrip";
import { RepeatLast } from "@/components/RepeatLast";
import { FeaturedStrip } from "@/components/FeaturedStrip";
import { XmasTouch } from "@/components/XmasTouch";
import { gsap, ScrollTrigger, useGSAP, noMotion } from "@/lib/gsap";
import { CategoryTabs, InfoPill } from "@/components/ui";
import { ProductInline } from "@/components/ProductInline";
import { Reveal, Stagger } from "@/components/Motion";

export default function Cardapio() {
  const { products, cats, settings } = useCatalog();
  const [tab, setTab] = useState("");
  // a category with no products is not shown to customers
  const CATS = cats.filter((c) => c.visible !== false && products.some((p) => p.cat === c.id));
  const root = useRef<HTMLDivElement>(null);
  const lock = useRef(0);

  const scrollTo = (id: string, smooth = true) => {
    const el = document.getElementById("cat-" + id);
    if (!el) return;
    lock.current = Date.now() + 1100;
    setTab(id);
    const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hh")) || 64;
    const top = el.getBoundingClientRect().top + window.scrollY - hh - 70;
    if (noMotion() || !smooth) { window.scrollTo(0, top); return; }
    const o = { y: window.scrollY };
    gsap.to(o, { y: top, duration: 1.1, ease: "power3.inOut", overwrite: true, onUpdate: () => window.scrollTo(0, o.y) });
  };

  useGSAP(() => {
    CATS.forEach((c) => {
      if (!document.getElementById("cat-" + c.id)) return;
      ScrollTrigger.create({
        trigger: "#cat-" + c.id,
        start: "top 240px",
        end: "bottom 240px",
        onToggle: (self) => { if (self.isActive && Date.now() > lock.current) setTab(c.id); },
      });
    });
    if (noMotion()) return;
    gsap.fromTo(".mh-title", { opacity: 0, y: 30, letterSpacing: "0.3em" }, { opacity: 1, y: 0, letterSpacing: "0.06em", duration: 1.4, delay: 0.15, ease: "expo.out" });
    gsap.fromTo(".mh-rest > *", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, delay: 0.5, ease: "expo.out" });
    gsap.utils.toArray<HTMLElement>(".cat-head").forEach((h) => {
      const st = { trigger: h, start: "top 88%", once: true };
      gsap.fromTo(h.querySelector("h2"), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.9, ease: "expo.out", scrollTrigger: st });
      gsap.fromTo(h, { "--w": 0 }, { "--w": 1, duration: 1.2, ease: "expo.out", scrollTrigger: st });
      gsap.fromTo(h.querySelectorAll(".pill"), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(2)", scrollTrigger: st });
    });
  }, { scope: root, dependencies: [CATS.map((c) => c.id).join()] });

  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && CATS.some((c) => c.id === h)) setTimeout(() => scrollTo(h), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on arrival
  }, []);

  return (
    <div ref={root}>
      <section className="mh">
        <XmasTouch />
        <h1 className="mh-title">Cardápio</h1>
        <ShopStatus />
        <div className="mh-rest">
          <p className="mh-hint">{settings.menuHint}</p>
        </div>
      </section>

      <div className="repeat-wrap"><RepeatLast /></div>
      <PromoStrip link={false} />
      <FeaturedStrip />

      <div className="tabsbar tabsbar-bar">
        <CategoryTabs variant="bar" items={CATS} value={tab || CATS[0]?.id} onChange={(id) => scrollTo(id)} />
      </div>

      <div className="menu">
        {CATS.map((c) => (
          <div key={c.id} id={"cat-" + c.id} className="cat">
            <div className="cat-head">
              <h2>{c.title}</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {c.info.map((i) => <InfoPill key={i.label} label={i.label} value={i.value} />)}
              </div>
            </div>
            <Stagger className="pi-list">
              {products.filter((p) => p.cat === c.id).map((p) => <ProductInline key={p.id} p={p} />)}
            </Stagger>
          </div>
        ))}
        <Reveal><p className="note">{settings.menuNote}</p></Reveal>
      </div>
    </div>
  );
}
