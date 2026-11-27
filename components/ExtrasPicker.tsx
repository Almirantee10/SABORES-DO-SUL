"use client";

import { fmt, type Product } from "@/lib/data";
import { extraKey } from "@/lib/extras";
import { OptionRow } from "./ui";

/** The product's extras, one block per group; the group's minimum and maximum decide what can be picked. */
export function ExtrasPicker({ p, picked, onChange }: { p: Product; picked: string[]; onChange: (next: string[]) => void }) {
  if (!p.extras?.length) return null;
  return (
    <>
      {p.extras.map((g) => {
        const keys = g.options.map((o) => extraKey(g.id, o.id));
        const n = keys.filter((k) => picked.includes(k)).length;
        const single = g.max === 1;
        const rule = g.min >= 1 ? (single ? "Obrigatório · escolha 1" : `Obrigatório · ${g.min === g.max ? `escolha ${g.max}` : `de ${g.min} a ${g.max}`}`) : single ? "Opcional · escolha 1" : `Opcional · até ${g.max}`;
        return (
          <div key={g.id} className="pi-flavors">
            <div className="pi-hint"><span>{g.name}</span><b>{rule}</b></div>
            {g.options.map((o, i) => {
              const k = keys[i];
              const on = picked.includes(k);
              return (
                <OptionRow
                  key={o.id}
                  type={single ? "radio" : "checkbox"}
                  checked={on}
                  disabled={!on && !single && n >= g.max}
                  label={o.name}
                  meta={o.price > 0 ? `+ ${fmt(o.price)}` : undefined}
                  onChange={() => onChange(single ? [...picked.filter((x) => !keys.includes(x)), ...(on && g.min === 0 ? [] : [k])] : on ? picked.filter((x) => x !== k) : [...picked, k])}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}
