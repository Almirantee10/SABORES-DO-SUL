"use client";

import { useState } from "react";
import { RATIO, fmt, img, photo, priceOf } from "@/lib/data";
import { useStore } from "@/components/Store";
import { useCatalog } from "@/components/Catalog";
import { Embers, CountUp, ParallaxBg, Reveal, SplitWords, Stagger } from "@/components/Motion";
import { HeroIntro } from "@/components/HeroIntro";
import { BagIcon, Button, CategoryTabs, InfoPill, PriceTag, SectionHeading, Thumb } from "@/components/ui";
import { Plus } from "lucide-react";

const occasions = [
  { title: "Aniversários e festas", text: "Cento de salgados com os sabores que você escolher, prontos para a mesa.", img: photo("bolinhas") },
  { title: "Reuniões e coffee break", text: "Minis de buffet e pão de queijo para receber clientes e equipe com praticidade.", img: img("mini-baguete") },
  { title: "Encontros em família", text: "Bolos caseiros e torta fria para o café da tarde ou uma comemoração especial.", img: img("bolo-laranja") },
];
const eventTypes = [{ id: "aniversario", label: "Festa" }, { id: "reuniao", label: "Reunião" }, { id: "coffee", label: "Coffee break" }];

export default function Festas() {
  const { openSheet } = useStore();
  const { products, byId, open: shopOpen } = useCatalog();
  const [guests, setGuests] = useState(40);
  const [type, setType] = useState("aniversario");

  const per = RATIO[type];
  const total = Math.ceil((guests * per) / 50) * 50;
  const centos = Math.floor(total / 100);
  const meio = total % 100 ? 1 : 0;
  const fritos = byId["fritos"]?.sizes;
  const price = centos * (fritos?.[0]?.price ?? 70) + meio * (fritos?.[1]?.price ?? 35);
  const text = [centos ? centos + (centos > 1 ? " centos" : " cento") : "", meio ? "meio cento" : ""].filter(Boolean).join(" + ");
  const buffet = products.filter((p) => p.cat === "buffet");

  return (
    <>
      <section className="hero" style={{ minHeight: 520 }}>
        <ParallaxBg src={photo("esfirra")} overlay="linear-gradient(180deg,rgba(20,12,8,.35),rgba(20,12,8,.75) 60%,#140C08)" />
        <Embers count={12} />
        <div className="hero-in" style={{ paddingTop: 120, paddingBottom: 64 }}>
          <HeroIntro label="Festas · Reuniões · Empresas" />
          <SplitWords text="Mais sabor para compartilhar com quem você gosta." delay={0.35} style={{ fontSize: "clamp(38px,6vw,64px)" }} />
          <p className="lead hero-fade" style={{ fontSize: 18, maxWidth: 600 }}>Do aniversário em casa ao coffee break da empresa: salgados por cento e minis de buffet, preparados sob encomenda.</p>
        </div>
      </section>

      <Stagger className="section grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", padding: "56px 20px", gap: 20 }}>
        {occasions.map((o) => (
          <div className="occ" key={o.title}>
            <div className="occ-img"><div style={{ backgroundImage: `url('${o.img}')` }} /></div>
            <div className="occ-body"><h3>{o.title}</h3><p>{o.text}</p></div>
          </div>
        ))}
      </Stagger>

      <section className="festa-band">
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "64px 20px", display: "flex", flexDirection: "column", gap: 28, position: "relative" }}>
          <SectionHeading>Quantos salgados pedir?</SectionHeading>
          <Reveal className="calc">
            <div className="calc-l">
              <label>
                <span className="lbl">Convidados</span>
                <div className="guests"><CountUp value={guests} /></div>
                <input className="range" type="range" min={10} max={300} step={5} value={guests} style={{ ["--pct" as string]: ((guests - 10) / 290) * 100 + "%" }} onChange={(e) => setGuests(Number(e.target.value))} aria-label="Número de convidados" />
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="lbl">Tipo de evento</span>
                <CategoryTabs items={eventTypes} value={type} onChange={setType} />
              </div>
            </div>
            <div className="calc-r">
              <div className="lbl" style={{ letterSpacing: ".18em" }}>Sugestão</div>
              <div className="big"><CountUp value={total} /> salgados</div>
              <div style={{ font: "400 15px/1.4 var(--font-body)", color: "var(--sds-cream-100)" }}>{text}</div>
              <div style={{ font: "400 13px/1 var(--font-body)", color: "var(--text-muted)", marginTop: 4 }}>Estimativa em salgados fritos</div>
              <CountUp value={price} format={(n) => fmt(n)} className="price price-lg" />
              <Button href="/cardapio#fritos"><BagIcon size={18} /> <span>Montar pedido</span></Button>
            </div>
          </Reveal>
          <p className="note">Valor aproximado, calculado a partir de {per} salgados por pessoa. O valor final é confirmado ao enviar o pedido.</p>
        </div>
      </section>

      <section style={{ maxWidth: 920, margin: "0 auto", padding: "64px 20px 80px", display: "flex", flexDirection: "column", gap: 28 }}>
        <SectionHeading kicker="Buffet">Cardápio</SectionHeading>
        <Stagger className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 16 }}>
          {buffet.map((b) => (
            <div className="bcard" key={b.id}>
              <Thumb src={b.img} size={150} icon={56} />
              <h3>{b.name}</h3>
              <PriceTag value={priceOf(b)} unit="unidade" />
              {b.min && b.min > 1 ? <InfoPill label="Pedido mínimo" value={`${b.min} unidades`} /> : null}
              <Button variant="outline" size="sm" disabled={!!b.soldOut || !shopOpen} onClick={() => openSheet(b.id)}>
                {b.soldOut ? <span>Esgotado</span> : !shopOpen ? <span>Fechado</span> : <><Plus size={16} /> <span>Adicionar</span></>}
              </Button>
            </div>
          ))}
        </Stagger>
      </section>
    </>
  );
}

