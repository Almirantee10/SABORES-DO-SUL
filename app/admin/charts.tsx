"use client";

import { useMemo, useState } from "react";
import { fmt } from "@/lib/data";

/* Small hand-drawn SVG charts: no chart library, nothing to download. */

const GOLD = "#E0B650";
const PALETTE = ["#E0B650", "#EFA62E", "#C9921C", "#8F6B22", "#F6D77A", "#B88B2E"];

export function BarChart({ data, unit = "money" }: { data: { label: string; value: number; sub?: string }[]; unit?: "money" | "count" }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 640;
  const H = 190;
  const bw = W / Math.max(1, data.length);
  const fmtV = (n: number) => (unit === "money" ? fmt(n) : String(n));
  const step = Math.ceil(data.length / 8);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H + 26}`} role="img" aria-label="Gráfico de barras">
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1="0" x2={W} y1={H - H * g} y2={H - H * g} stroke="rgba(245,235,221,.08)" />)}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - 8);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={i * bw} y="0" width={bw} height={H} fill="transparent" />
              <rect x={i * bw + bw * 0.14} y={H - h} width={Math.max(2, bw * 0.72)} height={Math.max(h, d.value ? 2 : 0)} rx="3" fill={hover === i ? "#F6D77A" : GOLD} opacity={d.value ? 1 : 0.18} />
              {i % step === 0 && <text x={i * bw + bw / 2} y={H + 18} textAnchor="middle" fontSize="11" fill="#C9AE8C">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <div className="chart-tip" aria-live="polite">
        {hover !== null ? <><b>{data[hover].label}</b> · {fmtV(data[hover].value)}{data[hover].sub ? ` · ${data[hover].sub}` : ""}</> : "Passe o dedo ou o mouse sobre uma barra"}
      </div>
    </div>
  );
}

export function HBars({ data, unit = "money", empty = "Sem dados no período." }: { data: { label: string; value: number; sub?: string }[]; unit?: "money" | "count"; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="adm-note">{empty}</p>;
  return (
    <div className="hbars">
      {data.map((d, i) => (
        <div key={d.label + i} className="hbar">
          <div className="hbar-top"><span>{d.label}</span><b>{unit === "money" ? fmt(d.value) : d.value}</b></div>
          <div className="hbar-track"><i style={{ width: `${(d.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} /></div>
          {d.sub && <small>{d.sub}</small>}
        </div>
      ))}
    </div>
  );
}

export function Donut({ data, empty = "Sem dados no período." }: { data: { label: string; value: number }[]; empty?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const arcs = useMemo(
    () =>
      data.map((d, i) => {
        const before = data.slice(0, i).reduce((a, x) => a + x.value, 0);
        return { ...d, from: before / (total || 1), to: (before + d.value) / (total || 1), color: PALETTE[i % PALETTE.length] };
      }),
    [data, total],
  );
  if (!total) return <p className="adm-note">{empty}</p>;
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Gráfico de pizza">
        <g transform="rotate(-90 70 70)">
          {arcs.map((a) => (
            <circle key={a.label} cx="70" cy="70" r={R} fill="none" stroke={a.color} strokeWidth="22" strokeDasharray={`${(a.to - a.from) * C} ${C}`} strokeDashoffset={-a.from * C} />
          ))}
        </g>
        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="#FBF6EE">{total}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#C9AE8C">pedidos</text>
      </svg>
      <ul>
        {arcs.map((a) => (
          <li key={a.label}><i style={{ background: a.color }} />{a.label}<b>{a.value} ({Math.round((a.value / total) * 100)}%)</b></li>
        ))}
      </ul>
    </div>
  );
}
