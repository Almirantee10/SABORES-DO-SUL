"use client";

import { useEffect, useRef, useState } from "react";
import { CATALOG, CATS, TAB_INFO, priceOf, unitOf } from "@/lib/data";
import { gsap, ScrollTrigger, useGSAP, noMotion } from "@/lib/gsap";
import { useStore } from "@/components/Store";
import { CategoryTabs, InfoPill, ProductCard, SectionHeading } from "@/components/ui";
import { Reveal, Stagger } from "@/components/Motion";

export default function Cardapio() {
  const { openSheet } = useStore();
  const [tab, setTab] = useState(CATS[0].id);
  const root = useRef<HTMLDivElement>(null);
  const lock = useRef(0);

  const scrollTo = (id: string, smooth = true) => {
    const el = document.getElementById("cat-" + id);
    if (!el) return;
    lock.current = Date.now() + 1100;
    setTab(id);
    const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hh")) || 64;
    const top = el.getBoundingClientRect().top + window.scrollY - hh - 76;
    if (noMotion() || !smooth) { window.scrollTo(0, top); return; }
    const o = { y: window.scrollY };
    gsap.to(o, { y: top, duration: 1.1, ease: "power3.inOut", overwrite: true, onUpdate: () => window.scrollTo(0, o.y) });
  };

  useGSAP(() => {
    // scroll-spy: highlight the tab of the section under the sticky bar
    CATS.forEach((c) => {
      ScrollTrigger.create({
        trigger: "#cat-" + c.id,
        start: "top 220px",
        end: "bottom 220px",
        onToggle: (self) => { if (self.isActive && Date.now() > lock.current) setTab(c.id); },
      });
    });
    if (noMotion()) return;
    gsap.utils.toArray<HTMLElement>(".cat-head").forEach((h) => {
      gsap.fromTo(h.querySelector("h2"), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } });
      gsap.fromTo(h, { "--w": 0 }, { "--w": 1, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } });
      gsap.fromTo(h.querySelectorAll(".pill"), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(2)", scrollTrigger: { trigger: h, start: "top 88%", once: true } });
    });
  }, { scope: root });

  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && CATS.some((c) => c.id === h)) setTimeout(() => scrollTo(h), 350);
  }, []);

  return (
    <div className="menu" ref={root}>
      <div className="menu-title">
        <SectionHeading kicker="Cardápio">Sabores do Sul</SectionHeading>
        <Reveal><h1>Menu</h1></Reveal>
      </div>

      <div className="tabsbar">
        <CategoryTabs items={CATS} value={tab} onChange={(id) => scrollTo(id)} />
      </div>

      <Reveal><p className="note" style={{ fontSize: 15 }}>Toque em um produto para escolher sabores, quantidade e adicionar ao seu pedido.</p></Reveal>

      {CATS.map((c) => (
        <div key={c.id} id={"cat-" + c.id} className="cat">
          <div className="cat-head">
            <h2>{c.title}</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {TAB_INFO[c.id].map((i) => <InfoPill key={i.label} label={i.label} value={i.value} />)}
            </div>
          </div>
          <Stagger className="pgrid">
            {CATALOG.filter((p) => p.cat === c.id).map((p) => (
              <ProductCard key={p.id} name={p.name} description={p.desc} price={priceOf(p)} unit={unitOf(p)} image={p.img} badge={p.badge} onOpen={() => openSheet(p.id)} />
            ))}
          </Stagger>
        </div>
      ))}
    </div>
  );
}
