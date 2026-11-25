"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { waLabel } from "@/lib/data";
import { useStore } from "@/components/Store";
import { useCatalog } from "@/components/Catalog";
import { InstagramIcon, WhatsAppIcon } from "@/components/Brand";

/* Contact block (WhatsApp number, copy button, Instagram) shown on the home page. */
export function ContactBand() {
  const { showToast } = useStore();
  const { settings } = useCatalog();
  const WA_LABEL = waLabel(settings.whatsapp);
  const ig = settings.instagram;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(WA_LABEL); } catch {}
    setCopied(true);
    showToast("Número copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="contact-band">
      <div className="mh-sub">{settings.tagline}</div>
      {settings.hours && <div className="mh-sub" style={{ marginTop: -6 }}>{settings.hours}</div>}
      <div className="mh-contact">
        <span className="mh-wa"><WhatsAppIcon size={18} color="var(--sds-whatsapp)" /><small>WhatsApp</small><b>{WA_LABEL}</b></span>
        <button type="button" className="btn btn-outline btn-sm" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} <span>{copied ? "Copiado" : "Copiar número"}</span></button>
        {ig && <a className="mh-ig" href={`https://www.instagram.com/${ig}/`} target="_blank" rel="noopener noreferrer"><InstagramIcon size={18} /> @{ig}</a>}
      </div>
    </section>
  );
}
