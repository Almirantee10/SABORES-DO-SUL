"use client";

import { useEffect, useState } from "react";

/* Discreet Christmas touch for the menu header: a thin garland and a few slow snow dots.
   Shows only from 20 Nov to 6 Jan, so it switches itself off after the season. */
const FLAKES = [8, 19, 31, 44, 57, 66, 78, 90];

export function XmasTouch() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const d = new Date();
    const m = d.getMonth() + 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the browser clock
    setOn((m === 11 && d.getDate() >= 20) || m === 12 || (m === 1 && d.getDate() <= 6));
  }, []);
  if (!on) return null;
  return (
    <div className="xmas" aria-hidden>
      <div className="xmas-garland" />
      {FLAKES.map((x, i) => (
        <i key={x} className="xmas-flake" style={{ left: `${x}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${11 + (i % 3) * 3}s`, width: 3 + (i % 3), height: 3 + (i % 3) }} />
      ))}
    </div>
  );
}
