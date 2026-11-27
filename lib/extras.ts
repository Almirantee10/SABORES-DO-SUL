import type { ExtraGroup, Product } from "@/lib/data";

/** An extra picked by the customer, as saved in the cart and in the order. */
export type PickedExtra = { name: string; price: number };

/** Option keys are "groupId:optionId". */
export const extraKey = (gid: string, oid: string) => `${gid}:${oid}`;

/** The product's own groups plus the shared ones (Adicionais tab) linked to it. */
export const groupsOf = (p: Product, shared: ExtraGroup[]): ExtraGroup[] => [
  ...(p.extras ?? []),
  ...(p.extraIds ?? []).map((id) => shared.find((g) => g.id === id)).filter((g): g is ExtraGroup => !!g),
];

/** What the picked keys come to: the extras themselves, their sum and what is still missing (empty = all rules met). */
export function readExtras(p: Product, picked: string[], shared: ExtraGroup[] = []): { chosen: PickedExtra[]; sum: number; problem: string } {
  const chosen: PickedExtra[] = [];
  let problem = "";
  for (const g of groupsOf(p, shared)) {
    const mine = g.options.filter((o) => picked.includes(extraKey(g.id, o.id))).slice(0, g.max);
    if (mine.length < g.min && !problem) problem = g.min === 1 ? `Escolha uma opção em "${g.name}".` : `Escolha pelo menos ${g.min} em "${g.name}".`;
    mine.forEach((o) => chosen.push({ name: o.name, price: o.price }));
  }
  return { chosen, sum: Math.round(chosen.reduce((a, e) => a + e.price, 0) * 100) / 100, problem };
}
