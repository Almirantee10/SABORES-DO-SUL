"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { IG_URL, WA_LABEL } from "@/lib/data";
import { useStore } from "@/components/Store";
import { InstagramIcon, WhatsAppIcon } from "@/components/Brand";

/* Contact block (WhatsApp number, copy button, Instagram) shown on the home page. */
export function ContactBand() {
  const { showToast } = useStore();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(WA_LABEL); } catch {}
    setCopied(true);
    showToast("Número copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="contact-band">
      <div className="mh-sub">Salgados · Pães · Cucas · Palmas-TO</div>
      <div className="mh-contact">
        <span className="mh-wa"><WhatsAppIcon size={18} color="var(--sds-whatsapp)" /><small>WhatsApp</small><b>{WA_LABEL}</b></span>
        <button type="button" className="btn btn-outline btn-sm" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} <span>{copied ? "Copiado" : "Copiar número"}</span></button>
        <a className="mh-ig" href={IG_URL} target="_blank" rel="noopener noreferrer"><InstagramIcon size={18} /> @saboresdosulpalmas</a>
      </div>
    </section>
  );
}
