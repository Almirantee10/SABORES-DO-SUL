import type { Product } from "@/lib/data";

/** An extra picked by the customer, as saved in the cart and in the order. */
export type PickedExtra = { name: string; price: number };

/** Option keys are "groupId:optionId". */
export const extraKey = (gid: string, oid: string) => `${gid}:${oid}`;

/** What the picked keys come to: the extras themselves, their sum and what is still missing (empty = all rules met). */
export function readExtras(p: Product, picked: string[]): { chosen: PickedExtra[]; sum: number; problem: string } {
  const chosen: PickedExtra[] = [];
  let problem = "";
  for (const g of p.extras ?? []) {
    const mine = g.options.filter((o) => picked.includes(extraKey(g.id, o.id))).slice(0, g.max);
    if (mine.length < g.min && !problem) problem = g.min === 1 ? `Escolha uma opção em "${g.name}".` : `Escolha pelo menos ${g.min} em "${g.name}".`;
    mine.forEach((o) => chosen.push({ name: o.name, price: o.price }));
  }
  return { chosen, sum: Math.round(chosen.reduce((a, e) => a + e.price, 0) * 100) / 100, problem };
}
