"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Banknote, BookUser, Link2, LocateFixed, MapPin, MessageSquare, Phone, ShoppingBag, Trash2, User } from "lucide-react";
import { PAY, fmt, formatPhone, validPhone } from "@/lib/data";
import { defaultSettings } from "@/lib/store-data";
import { gsap, useGSAP, noMotion } from "@/lib/gsap";
import { useStore } from "@/components/Store";
import { useCatalog } from "@/components/Catalog";
import { TimePicker } from "@/components/TimePicker";
import { ShopStatus } from "@/components/ShopStatus";
import { recordOrder } from "@/lib/orders-client";
import { WhatsAppIcon } from "@/components/Brand";
import { Button, Field, OptionRow, PriceTag, QuantityStepper, SectionHeading, Thumb } from "@/components/ui";
import { CountUp, Reveal } from "@/components/Motion";

export default function Carrinho() {
  const { cart, fee, grand, checkout, setCheckout, patchItem, removeItem, clearCart, setSent, buildMessage, hydrated } = useStore();
  const root = useRef<HTMLDivElement>(null);
  const { open: shopOpen, settings } = useCatalog();
  const payOptions = PAY.filter((p) => settings.pay.includes(p.id));

  // only one way of receiving may be on: select it
  useEffect(() => {
    if (!hydrated) return;
    if (checkout.delivery === "entrega" && !settings.deliveryOn && settings.pickupOn) setCheckout({ delivery: "retirada" });
    if (checkout.delivery === "retirada" && !settings.pickupOn && settings.deliveryOn) setCheckout({ delivery: "entrega" });
    if (checkout.pay && !settings.pay.includes(checkout.pay)) setCheckout({ pay: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, settings.deliveryOn, settings.pickupOn, settings.pay]);

  // earliest date the customer can pick; read in the browser so the page can still be prerendered
  const [today, setToday] = useState("");
  useEffect(() => {
    const n = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the browser clock
    setToday(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`);
  }, []);

  useGSAP(() => {
    if (!hydrated || noMotion()) return;
    gsap.fromTo(".citem", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "expo.out", clearProps: "transform" });
    gsap.fromTo(".checkout", { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1, delay: 0.15, ease: "expo.out", clearProps: "transform" });
  }, { scope: root, dependencies: [hydrated, cart.length === 0] });

  const remove = (uid: string) => {
    const el = document.querySelector<HTMLElement>(`[data-uid="${uid}"]`);
    if (!el || noMotion()) { removeItem(uid); return; }
    gsap.to(el, { x: 80, opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: -12, duration: 0.5, ease: "power3.in", onComplete: () => removeItem(uid) });
  };

  const missing = [
    !checkout.custName.trim() && "seu nome",
    checkout.phone.trim() && !validPhone(checkout.phone) && "o telefone completo com DDD (ou deixe em branco)",
    !checkout.date && "a data",
    !checkout.time && "o horário",
    !checkout.pay && "a forma de pagamento",
  ].filter(Boolean) as string[];
  const cantSend = missing.length > 0 || !shopOpen;
  const send = () => {
    if (cantSend || !cart.length) return;
    setSent(buildMessage());
    void recordOrder(cart, checkout);
  };

  const verb = checkout.delivery === "entrega" ? "entrega" : "retirada";

  // Contact Picker API: Android Chrome only (iPhone has no equivalent), so the button shows only where it works
  type Picker = { select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> };
  const [canPickContact, setCanPick] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature check needs the browser
    setCanPick("contacts" in navigator && "ContactsManager" in window);
  }, []);
  const pickContact = async () => {
    try {
      const [c] = await (navigator as unknown as { contacts: Picker }).contacts.select(["name", "tel"], { multiple: false });
      if (!c) return;
      const tel = c.tel?.[0] ? formatPhone(c.tel[0].replace(/^\+?55/, "")) : "";
      setCheckout({ ...(tel ? { phone: tel } : {}), ...(!checkout.custName.trim() && c.name?.[0] ? { custName: c.name[0] } : {}) });
    } catch {
      // closed without choosing
    }
  };

  const [geo, setGeo] = useState<{ busy: boolean; err: string }>({ busy: false, err: "" });
  const locate = () => {
    if (!navigator.geolocation) return setGeo({ busy: false, err: "Este aparelho não consegue informar a localização." });
    setGeo({ busy: true, err: "" });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCheckout({ mapLink: `https://www.google.com/maps?q=${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}` });
        setGeo({ busy: false, err: "" });
      },
      (e) => setGeo({ busy: false, err: e.code === e.PERMISSION_DENIED ? "Permita o acesso à localização no navegador e tente de novo." : "Não foi possível pegar a localização. Cole o link do mapa." }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <div className="cart" ref={root}>
      <div className="cart-head">
        <Link href="/cardapio" className="iconbtn" aria-label="Voltar ao cardápio"><ArrowLeft size={20} /></Link>
        <h1>Meu pedido</h1>
      </div>
      {!shopOpen && <ShopStatus compact />}

      {hydrated && cart.length === 0 && (
        <Reveal className="empty">
          <ShoppingBag size={40} />
          <p className="lead" style={{ fontSize: 17 }}>Seu pedido está vazio. Que tal começar por um cento de salgados?</p>
          <Button href="/cardapio">Ver cardápio</Button>
        </Reveal>
      )}

      {cart.length > 0 && (
        <div className="cart-grid">
          <div className="cart-list">
            {cart.map((it) => (
              <div className="citem" key={it.uid} data-uid={it.uid}>
                <div className="citem-top">
                  <Thumb src={it.img} size={64} icon={28} className="citem-ring" />
                  <div className="citem-info">
                    <b>{it.name}</b>
                    <small>
                      {it.sizeLabel ? `${it.sizeLabel} · ${fmt(it.price)} cada` : `${fmt(it.price)} por unidade`}
                      {it.pct ? <span className="promo-tag">-{it.pct}%{it.origPrice ? ` · de ${fmt(it.origPrice)}` : ""}</span> : null}
                    </small>
                    {it.flavors.map((f) => <span className="fl" key={f}>- {f}</span>)}
                  </div>
                  <button className="iconbtn iconbtn-ghost" aria-label="Remover" onClick={() => remove(it.uid)}><Trash2 size={18} /></button>
                </div>
                <div className="citem-foot">
                  <QuantityStepper size="sm" value={it.qty} min={it.min} step={it.step} onChange={(v) => patchItem(it.uid, { qty: v })} />
                  <PriceTag value={it.qty * it.price} />
                </div>
                <Field icon={<MessageSquare size={18} />} placeholder="Observação deste item (opcional)" value={it.obs} onChange={(e) => patchItem(it.uid, { obs: e.target.value })} />
              </div>
            ))}
            <div><Button variant="ghost" size="sm" onClick={clearCart}><Trash2 size={16} /> <span>Limpar pedido</span></Button></div>
          </div>

          <div className="checkout">
            <SectionHeading align="left">Finalizar</SectionHeading>
            <Field label="Seu nome (obrigatório)" required icon={<User size={18} />} placeholder="Nome de quem está fazendo o pedido" value={checkout.custName} onChange={(e) => setCheckout({ custName: e.target.value })} />
            <Field label="Telefone / WhatsApp (opcional)" type="tel" inputMode="tel" autoComplete="tel" icon={<Phone size={18} />} placeholder="(63) 99999-9999" value={checkout.phone} onChange={(e) => setCheckout({ phone: formatPhone(e.target.value) })} />
            {canPickContact && <button type="button" className="btn btn-ghost btn-sm" onClick={pickContact}><BookUser size={16} /> <span>Escolher da agenda</span></button>}
            <div className="grp">
              <span className="lbl">Recebimento</span>
              {settings.pickupOn && <OptionRow type="radio" checked={checkout.delivery === "retirada"} label="Retirada no local" description="Você busca no horário combinado" onChange={() => setCheckout({ delivery: "retirada" })} />}
              {settings.deliveryOn && <OptionRow type="radio" checked={checkout.delivery === "entrega"} label="Entrega" description={settings.deliveryFee > 0 ? `Levamos até você · taxa ${fmt(settings.deliveryFee)}` : "Levamos até você"} onChange={() => setCheckout({ delivery: "entrega" })} />}
            </div>
            {checkout.delivery === "entrega" && (
              <>
                <Field label="Endereço de entrega (opcional)" icon={<MapPin size={18} />} placeholder="Rua, número, bairro, referência" value={checkout.address} onChange={(e) => setCheckout({ address: e.target.value })} />
                <div className="grp">
                  <Field label="Link da localização (opcional)" type="url" inputMode="url" icon={<Link2 size={18} />} placeholder="Cole o link do Google Maps" value={checkout.mapLink} onChange={(e) => setCheckout({ mapLink: e.target.value })} />
                  <Button variant="outline" size="sm" full disabled={geo.busy} onClick={locate}><LocateFixed size={16} /> <span>{geo.busy ? "Buscando localização…" : "Usar minha localização atual"}</span></Button>
                  {geo.err && <p className="warn" role="alert">{geo.err}</p>}
                  {checkout.mapLink && (
                    <p className="note" style={{ textAlign: "left" }}>
                      Localização salva. <a href={checkout.mapLink} target="_blank" rel="noopener noreferrer">Ver no mapa</a> · enviada só com o pedido.
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="grp">
              <span className="lbl">Data e horário da {verb} (obrigatório)</span>
              <div className="when">
                <Field type="date" required min={today || undefined} aria-label={`Data da ${verb}`} value={checkout.date} onChange={(e) => setCheckout({ date: e.target.value })} />
                <TimePicker label={`Horário da ${verb}`} value={checkout.time} onChange={(time) => setCheckout({ time })} />
              </div>
            </div>
            <div className="grp">
              <span className="lbl">Forma de pagamento</span>
              {payOptions.map((o) => <OptionRow key={o.id} type="radio" checked={checkout.pay === o.id} label={o.label} onChange={() => setCheckout({ pay: o.id })} />)}
            </div>
            {checkout.pay === "dinheiro" && (
              <Field label="Troco para (opcional)" icon={<Banknote size={18} />} placeholder="Ex.: R$ 200,00" value={checkout.troco} onChange={(e) => setCheckout({ troco: e.target.value })} />
            )}
            <Field label="Observações do pedido (opcional)" multiline placeholder="Recados para a cozinha..." value={checkout.obsGeral} onChange={(e) => setCheckout({ obsGeral: e.target.value })} />
            {fee > 0 && <div className="total-row" style={{ fontSize: 15 }}><span>Taxa de entrega</span><span>{fmt(fee)}</span></div>}
            <div className="total-row">
              <span>Total</span>
              <CountUp value={grand} format={fmt} className="price price-lg" />
            </div>
            {settings.deliveryNote && checkout.delivery === "entrega" && !(fee > 0 && settings.deliveryNote === defaultSettings().deliveryNote) && <p className="note" style={{ textAlign: "left", marginTop: -10 }}>{settings.deliveryNote}</p>}
            <Button variant="whatsapp" size="lg" full disabled={cantSend} onClick={send}><WhatsAppIcon size={22} /> <span>Enviar pedido pelo WhatsApp</span></Button>
            {!shopOpen && <p className="warn" style={{ marginTop: -10 }}>Estamos fechados no momento. O envio de pedidos está pausado.</p>}
            {shopOpen && cantSend && <p className="warn" style={{ marginTop: -10 }}>Para enviar, preencha: {missing.join(", ")}.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
