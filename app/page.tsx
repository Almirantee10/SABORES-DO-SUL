import Link from "next/link";
import { ChefHat, Clock, PartyPopper, ArrowRight } from "lucide-react";
import { img, photo, MARQUEE } from "@/lib/data";
import { Embers, Marquee, ParallaxBg, Reveal, SplitWords, SplitWordsH2, Stagger, Tilt } from "@/components/Motion";
import { Badge, BagIcon, Button, PriceTag, SectionHeading } from "@/components/ui";
import { HeroIntro } from "@/components/HeroIntro";
import { HeroLogo } from "@/components/HeroLogo";
import { PromoStrip } from "@/components/PromoStrip";

const options = [
  { title: "Fritos", desc: "Coxinha, quibe, bolinhas e mais. Bem sequinhos e dourados.", from: "Cento a partir de", price: 70, unit: "", img: photo("bolinhas"), href: "/cardapio#fritos" },
  { title: "Assados", desc: "Esfirras, minipizzas, enroladinho e mini hambúrguer assado.", from: "Cento a partir de", price: 110, unit: "", img: photo("esfirra"), href: "/cardapio#assados" },
  { title: "Buffet", desc: "Minis gourmet para festas, reuniões e coffee break.", from: "A partir de", price: 2.75, unit: "unidade", img: img("mini-hamburguer"), href: "/cardapio#buffet" },
];

const pillars = [
  { Icon: Clock, title: "Praticidade", text: "Monte seu pedido no site e envie direto para o nosso WhatsApp, sem cadastro e sem complicação." },
  { Icon: ChefHat, title: "Sabor caseiro", text: "Massa fininha, recheio generoso e tudo preparado sob encomenda, para chegar fresquinho." },
  { Icon: PartyPopper, title: "Versatilidade", text: "Do lanche da tarde à festa de aniversário: fritos, assados, buffet, bolos e pão de queijo." },
];

export default function Home() {
  return (
    <>
      <section className="hero hero-logo-on">
        <ParallaxBg src={photo("hero-salgados")} overlay="linear-gradient(180deg,rgba(21,13,12,.1) 0%,rgba(21,13,12,.58) 50%,rgba(21,13,12,.9) 100%)" amount={10} zoom={false} className="hero-bg-food" />
        <Embers />
        <HeroLogo />
        <div className="hero-in">
          <HeroIntro />
          <SplitWords text="Seu lanche gostoso, sem complicação." delay={0.35} />
          <p className="lead hero-fade">Salgados fritos e assados, buffet de minis e bolos caseiros. Praticidade para a sua rotina e sabor para os seus grandes momentos.</p>
          <div className="hero-cta hero-fade">
            <Button size="lg" href="/cardapio" magnetic><BagIcon size={20} /> <span>Montar meu pedido</span></Button>
            <Button size="lg" variant="outline" href="/festas" magnetic>Festas e eventos</Button>
          </div>
        </div>
        <span className="scrollcue" aria-hidden />
      </section>

      <PromoStrip />

      <Marquee items={MARQUEE} />

      <section className="section">
        <SectionHeading>Escolha o seu sabor</SectionHeading>
        <Stagger className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", perspective: 1000 }}>
          {options.map((o) => (
            <Tilt key={o.title} max={7} style={{ transformStyle: "preserve-3d" }}>
              <Link href={o.href} className="opt-card">
                <div className="ring float" style={{ backgroundImage: `url('${o.img}')` }} />
                <div className="opt-title">{o.title}</div>
                <p>{o.desc}</p>
                <div className="from">{o.from}</div>
                <PriceTag value={o.price} unit={o.unit} framed />
              </Link>
            </Tilt>
          ))}
        </Stagger>
      </section>

      <section className="festa-band">
        <div className="two">
          <Reveal>
            <div className="eyebrow">Para o dia a dia</div>
            <SplitWordsH2 text="Mais sabor na rotina, sem perder tempo." />
            <p>Pão de queijo pronto para assar, bolos caseiros e torta fria para o café da tarde ou aquela visita de última hora. É só pedir pelo WhatsApp.</p>
            <div className="badge-row"><Badge>Pão de queijo</Badge><Badge>Bolos caseiros</Badge><Badge>Torta fria</Badge></div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="eyebrow">Para festas e empresas</div>
            <SplitWordsH2 text="Salgados para deixar sua festa ainda mais especial." />
            <p>Cento e meio cento de salgados, minis de buffet e coffee break para reuniões. Você escolhe os sabores, a gente prepara tudo sob encomenda.</p>
            <Button href="/festas">Festas e eventos <ArrowRight size={18} /></Button>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <SectionHeading>Por que Sabores do Sul</SectionHeading>
        <Stagger className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          {pillars.map(({ Icon, title, text }) => (
            <div className="pillar" key={title}>
              <div className="ic"><Icon size={24} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </Stagger>
      </section>

      <section className="cta">
        <ParallaxBg src={img("pao-de-queijo-assado")} overlay="linear-gradient(180deg,rgba(20,12,8,.82),rgba(20,12,8,.93))" amount={20} zoom={false} />
        <Reveal className="cta-in">
          <h2>Faça seu pedido sem perder tempo.</h2>
          <p>Escolha os produtos no cardápio, finalize no carrinho e seu pedido chega direto no nosso WhatsApp.</p>
          <Button size="lg" href="/cardapio" magnetic><BagIcon size={20} /> <span>Montar meu pedido</span></Button>
        </Reveal>
      </section>
    </>
  );
}

