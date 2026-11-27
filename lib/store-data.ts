import { CATALOG, CATS, PAY, TAB_INFO, WA, type Product } from "@/lib/data";
import type { Promo } from "@/lib/promo";
import { defaultSchedule, type Schedule } from "@/lib/schedule";

export type Cat = { id: string; label: string; title: string; info: { label: string; value: string }[] };

/** Contact, delivery, payment and the texts the customer reads. */
export type Settings = {
  /** country code + area code + number, digits only */
  whatsapp: string;
  /** Instagram user name without the @ */
  instagram: string;
  tagline: string;
  /** the paragraph under the title on the home page */
  description: string;
  /** opening hours, free text (shown on the home page when filled) */
  hours: string;
  pickupOn: boolean;
  deliveryOn: boolean;
  deliveryFee: number;
  deliveryNote: string;
  /** ids of the payment methods the customer can pick */
  pay: string[];
  menuHint: string;
  menuNote: string;
  ctaTitle: string;
  ctaText: string;
  /** own images (empty = the ones shipped with the site): header/footer logo, round badge on the home page, home page banner */
  logo: string;
  badge: string;
  banner: string;
  /** shop name and street address (shown on the site when filled) */
  name: string;
  address: string;
  /** automatic opening and closing by day of the week */
  schedule: Schedule;
};

/** Everything the admin can change: the menu, the categories, the promotions, the settings and whether the shop is taking orders. */
export type StoreData = {
  open: boolean;
  closedMessage: string;
  products: Product[];
  promos: Promo[];
  cats: Cat[];
  settings: Settings;
  updatedAt: number;
};

export const defaultCats = (): Cat[] => CATS.map((c) => ({ ...c, info: (TAB_INFO[c.id] ?? []).map((i) => ({ ...i })) }));

export const defaultSettings = (): Settings => ({
  whatsapp: WA,
  instagram: "saboresdosulpalmas",
  tagline: "Salgados · Pães · Cucas · Palmas-TO",
  description: "Salgados fritos e assados, buffet de minis e bolos caseiros. Praticidade para a sua rotina e sabor para os seus grandes momentos.",
  hours: "",
  pickupOn: true,
  deliveryOn: true,
  deliveryFee: 0,
  deliveryNote: "Taxa de entrega, se houver, é combinada pelo WhatsApp.",
  pay: PAY.map((p) => p.id),
  menuHint: "Escolha os sabores, toque em Adicionar, monte seu pedido e envie pelo WhatsApp.",
  menuNote: "Tudo é feito sob encomenda. Valores e sabores conforme o cardápio.",
  ctaTitle: "Faça seu pedido sem perder tempo.",
  ctaText: "Escolha os produtos no cardápio, finalize no carrinho e seu pedido chega direto no nosso WhatsApp.",
  logo: "",
  badge: "",
  banner: "",
  name: "Sabores do Sul",
  address: "",
  schedule: defaultSchedule(),
});

/**
 * Description updates for a menu that was already saved from the admin panel.
 * A description is replaced only while it still holds the old original text, so anything the admin typed is kept.
 */
const DESC_UPDATES: Record<string, { from: string; to: string }> = Object.fromEntries(
  CATALOG.filter((p) => p.descWas).map((p) => [p.id, { from: p.descWas as string, to: p.desc }]),
);

/** Fills in what a menu saved by an older version of the site does not have yet. */
export const withDescUpdates = (d: StoreData): StoreData => ({
  ...d,
  promos: Array.isArray(d.promos) ? d.promos : [],
  cats: Array.isArray(d.cats) && d.cats.length ? d.cats : defaultCats(),
  settings: { ...defaultSettings(), ...(d.settings ?? {}) },
  products: d.products.map((p) => (DESC_UPDATES[p.id]?.from === p.desc ? { ...p, desc: DESC_UPDATES[p.id].to } : p)),
});

export const defaultStore = (): StoreData => ({
  open: true,
  closedMessage: "",
  products: CATALOG,
  promos: [],
  cats: defaultCats(),
  settings: defaultSettings(),
  updatedAt: 0,
});
