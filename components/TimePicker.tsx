"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

const pad = (s: string) => (s.length === 1 ? "0" + s : s);

/** Time field: two empty boxes to type in, hours and minutes. Value is "HH:MM" ("" until both are filled). */
export function TimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [init] = useState(() => (/^\d{2}:\d{2}$/.test(value) ? value.split(":") : ["", ""]));
  const [h, setH] = useState(init[0]);
  const [m, setM] = useState(init[1]);

  const commit = (nh: string, nm: string) => onChange(nh && nm ? `${pad(nh)}:${pad(nm)}` : "");
  const clean = (v: string, max: number) => {
    const d = v.replace(/\D/g, "").slice(0, 2);
    return d && +d > max ? d.slice(0, 1) : d;
  };

  return (
    <div className="field-box tp-box" role="group" aria-label={label}>
      <Clock size={18} />
      <input
        className="tp-in"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Hora"
        aria-label={`${label}: hora`}
        required
        value={h}
        onChange={(e) => { const v = clean(e.target.value, 23); setH(v); commit(v, m); }}
        onBlur={() => { if (h) { setH(pad(h)); if (!m) setM("00"); commit(pad(h), m || "00"); } }}
      />
      <span className="tp-sep">:</span>
      <input
        className="tp-in"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Min"
        aria-label={`${label}: minutos`}
        required
        value={m}
        onChange={(e) => { const v = clean(e.target.value, 59); setM(v); commit(h, v); }}
        onBlur={() => { if (m) { setM(pad(m)); commit(h, pad(m)); } }}
      />
    </div>
  );
}
