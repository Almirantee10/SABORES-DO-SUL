"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

const HOURS = Array.from({ length: 17 }, (_, i) => String(6 + i).padStart(2, "0")); // 06 to 22
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")); // 00, 05 ... 55

/** Time field: a button that opens a small box with two columns, hours and minutes. Value is "HH:MM" ("" = none). */
export function TimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [h, m] = /^\d{2}:\d{2}$/.test(value) ? value.split(":") : ["", ""];

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    // bring the chosen hour into view
    box.current?.querySelectorAll<HTMLElement>(".tp-on").forEach((el) => el.scrollIntoView({ block: "center" }));
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="tp" ref={box}>
      <button type="button" className="field-box tp-btn" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Clock size={18} />
        <span className={h ? "" : "tp-ph"}>{h ? `${h}:${m}` : "Horário"}</span>
      </button>
      {open && (
        <div className="tp-pop" role="dialog" aria-label={label}>
          <div className="tp-cols">
            <div className="tp-col" role="listbox" aria-label="Hora">
              <b>Hora</b>
              {HOURS.map((x) => (
                <button key={x} type="button" role="option" aria-selected={x === h} className={x === h ? "tp-on" : ""} onClick={() => onChange(`${x}:${m || "00"}`)}>{x}</button>
              ))}
            </div>
            <div className="tp-col" role="listbox" aria-label="Minutos">
              <b>Min</b>
              {MINUTES.map((x) => (
                <button key={x} type="button" role="option" aria-selected={x === m} className={x === m ? "tp-on" : ""} onClick={() => onChange(`${h || "12"}:${x}`)}>{x}</button>
              ))}
            </div>
          </div>
          <button type="button" className="tp-ok" disabled={!h} onClick={() => setOpen(false)}>OK</button>
        </div>
      )}
      {/* keeps the browser's "required" check working */}
      <input tabIndex={-1} aria-hidden="true" required value={value} onChange={() => {}} style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 1, width: 1, bottom: 0, left: 0 }} />
    </div>
  );
}
