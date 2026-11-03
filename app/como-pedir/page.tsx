"use client";

import { useRef, useState } from "react";
import { CalendarCheck, ChevronDown, ListChecks, MapPin, MessageCircle } from "lucide-react";
import { IG_URL, WA_LABEL } from "@/lib/data";
import { gsap, useGSAP, noMotion } from "@/lib/gsap";
import { Reveal, SplitWords, Stagger } from "@/components/Motion";
import { Button, SectionHeading } from "@/components/ui";
import { InstagramIcon, WhatsAppIcon } from "@/components/Brand";

const steps = [
  { n: 1, Icon: ListChecks, title: "Monte seu pedido", text: "No cardápio, escolha os produtos, sabores e quantidades. Deixe observações em cada item." },
  { n: 2, Icon: MessageCircle, title: "Envie pelo WhatsApp", text: "Escolha retirada ou entrega e a forma de pagamento. O pedido chega organizado no nosso WhatsApp." },
  { n: 3, Icon: CalendarCheck, title: "Receba ou retire", text: "Confirmamos o valor e combinamos o horário que for melhor para você." },
];
const faq = [
  { q: "Qual é o pedido mínimo?", a: "Salgados fritos e assados a partir de meio cento (50 unidades). Canudinhos: 50 unidades. Minis de buffet: 25 ou 30 unidades, conforme o item." },
  { q: "Quantos sabores posso escolher?", a: "Fritos: até 5 sabores no cento e 4 no meio cento. Assados: até 4 sabores no cento e 2 no meio cento." },
  { q: "Com quanto tempo de antecedência devo encomendar?", a: "Tudo é feito sob encomenda. Quanto antes você pedir, melhor garantimos a sua data. Para festas de última hora, chame no WhatsApp e consulte a disponibilidade." },
  { q: "Vocês entregam?", a: "Você escolhe retirada ou entrega ao finalizar o pedido. O endereço é opcional e a taxa, se houver, é combinada pelo WhatsApp." },
  { q: "Quais são as formas de pagamento?", a: "Pix, cartão de crédito, cartão de débito ou dinheiro. Você escolhe ao finalizar o pedido." },
];

export default function ComoPedir() {
  const [open, setOpen] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: root });

  // the gold line that links the three steps draws as you scroll
  useGSAP(() => {
    if (noMotion()) return;
    gsap.fromTo(".steps-line", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 75%", end: "bottom 60%", scrub: 0.6 } });
    gsap.fromTo(".step-n", { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.9, stagger: 0.18, ease: "back.out(2)", scrollTrigger: { trigger: ".steps", start: "top 80%", once: true } });
  }, { scope: root });

  const toggle = contextSafe((i: number) => {
    const items = gsap.utils.toArray<HTMLElement>(".faq-a");
    const next = open === i ? -1 : i;
    items.forEach((el, k) => gsap.to(el, { height: k === next ? "auto" : 0, duration: 0.6, ease: "expo.out" }));
    setOpen(next);
  });

  return (
    <div ref={root}>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
          <SplitWords text="Como pedir" className="serif-title" style={{ font: "700 clamp(38px,6vw,60px)/1.1 var(--font-serif)", color: "var(--sds-gold-400)" }} />
          <Reveal delay={0.3}><p className="lead" style={{ fontSize: 18, maxWidth: 560 }}>Três passos e o seu pedido está garantido.</p></Reveal>
        </div>
        <div style={{ position: "relative" }}>
          <div className="steps-line" aria-hidden />
          <Stagger className="steps">
            {steps.map(({ n, Icon, title, text }) => (
              <div className="step" key={n}>
                <div className="step-top"><div className="step-n">{n}</div><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      <section style={{ maxWidth: 820, margin: "0 auto", padding: "16px 20px 72px", display: "flex", flexDirection: "column", gap: 28 }}>
        <SectionHeading>Dúvidas frequentes</SectionHeading>
        <Stagger className="faq">
          {faq.map((f, i) => (
            <div key={i} className={`faq-item${open === i ? " open" : ""}`}>
              <button type="button" className="faq-q" aria-expanded={open === i} onClick={() => toggle(i)}>
                <span>{f.q}</span><ChevronDown size={20} />
              </button>
              <div className="faq-a" style={{ height: i === 0 ? "auto" : 0 }}><p>{f.a}</p></div>
            </div>
          ))}
        </Stagger>
      </section>

      <section className="festa-band">
        <Stagger className="two" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 20 }}>
          <div className="contact">
            <WhatsAppIcon size={28} color="var(--sds-whatsapp)" />
            <div className="lbl" style={{ letterSpacing: ".18em" }}>WhatsApp</div>
            <div className="v">{WA_LABEL}</div>
          </div>
          <div className="contact">
            <InstagramIcon size={28} color="var(--sds-gold-400)" />
            <div className="lbl" style={{ letterSpacing: ".18em" }}>Instagram</div>
            <div className="v">@saboresdosulpalmas</div>
            <Button variant="outline" size="sm" href={IG_URL} external>Ver fotos</Button>
          </div>
          <div className="contact">
            <MapPin size={28} color="var(--sds-gold-400)" />
            <div className="lbl" style={{ letterSpacing: ".18em" }}>Onde estamos</div>
            <div className="v">Palmas-TO</div>
            <p>Entrega e retirada combinadas no atendimento.</p>
          </div>
        </Stagger>
      </section>
    </div>
  );
}
