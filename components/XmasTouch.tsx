"use client";

import { useEffect, useState } from "react";

/* Christmas touch (menu header and home banner): a garland with baubles and twinkling lights,
   a few golden sparkles and slow snow. Shows only from 20 Nov to 6 Jan, so it switches itself off after the season. */
const FLAKES = [5, 12, 20, 28, 36, 44, 52, 60, 68, 75, 83, 90, 96];
const STARS: [number, number][] = [[9, 46], [24, 70], [41, 54], [58, 74], [73, 50], [88, 68], [96, 42]];

export function XmasTouch({ tall = false }: { tall?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const d = new Date();
    const m = d.getMonth() + 1;
    const season = (m === 11 && d.getDate() >= 20) || m === 12 || (m === 1 && d.getDate() <= 6);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the browser clock
    setOn(season);
    if (season) document.documentElement.dataset.xmas = "1";
    return () => { delete document.documentElement.dataset.xmas; };
  }, []);
  if (!on) return null;
  return (
    <div className={`xmas${tall ? " xmas-tall" : ""}`} aria-hidden>
      <div className="xmas-garland" />
      <div className="xmas-lights xmas-a" />
      <div className="xmas-lights xmas-b" />
      {STARS.map(([x, y], i) => (
        <i key={x} className="xmas-star" style={{ left: `${x}%`, top: `${tall ? y * 1.6 : y}%`, animationDelay: `${-i * 0.9}s`, width: 9 + (i % 3) * 3, height: 9 + (i % 3) * 3 }} />
      ))}
      {FLAKES.map((x, i) => (
        <i key={x} className="xmas-flake" style={{ left: `${x}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${11 + (i % 3) * 3}s`, width: 3 + (i % 3), height: 3 + (i % 3) }} />
      ))}
    </div>
  );
}
