/** Opening hours by day of the week, used to open and close the shop by itself. */
export type DaySched = { closed: boolean; open: string; close: string };
export type Schedule = { on: boolean; days: DaySched[] };

export const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** index 0 = Sunday */
export const defaultSchedule = (): Schedule => ({
  on: false,
  days: DAY_NAMES.map((_, i) => ({ closed: i === 0, open: "08:00", close: "18:00" })),
});

const mins = (t: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  return m ? +m[1] * 60 + +m[2] : -1;
};

/** Is the shop inside its schedule right now? The shop is in Palmas (UTC-3, no daylight saving), whatever the visitor's clock says. */
export function scheduleOpen(s: Schedule, now: Date = new Date()): boolean {
  if (!s.on) return true;
  const local = new Date(now.getTime() - 3 * 3600_000);
  const d = s.days[local.getUTCDay()];
  if (!d || d.closed) return false;
  const cur = local.getUTCHours() * 60 + local.getUTCMinutes();
  return cur >= mins(d.open) && cur < mins(d.close);
}
