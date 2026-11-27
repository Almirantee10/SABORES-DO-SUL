import { PAY, type ExtraGroup, type ExtraOption, type Product, type Size } from "@/lib/data";
import { defaultSettings, type Cat, type Settings, type StoreData } from "@/lib/store-data";
import type { Promo } from "@/lib/promo";
import { DAY_NAMES, defaultSchedule, type Schedule } from "@/lib/schedule";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, min: number, max: number) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
};
const int = (v: unknown, min: number, max: number) => {
  const n = num(v, min, max);
  return n === null ? null : Math.round(n);
};
const slug = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Only photos we host (or the ones shipped with the site) are accepted. */
function image(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  if (s.startsWith("/assets/photos/") && !s.includes("..")) return s;
  if (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[\w./%-]+$/i.test(s)) return s;
  // local development only: uploads are kept inline instead of in Blob
  if (process.env.NODE_ENV !== "production" && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 600_000) return s;
  return null;
}

function size(raw: unknown): Size | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = slug(str(r.id, 20)) || "unico";
  const price = num(r.price, 0, 99999);
  const label = str(r.label, 30);
  if (price === null || !label) return null;
  const max = r.max == null ? undefined : (int(r.max, 1, 20) ?? undefined);
  return { id, label, sub: str(r.sub, 60), price, ...(max ? { max } : {}) };
}

function product(raw: unknown, used: Set<string>, catIds: Set<string>): Product | string {
  if (!raw || typeof raw !== "object") return "produto inválido";
  const r = raw as Record<string, unknown>;
  const name = str(r.name, 80);
  if (!name) return "todo produto precisa de nome";
  const cat = str(r.cat, 20);
  if (!catIds.has(cat)) return `categoria inválida em "${name}"`;

  let id = slug(str(r.id, 40)) || slug(name) || "produto";
  const base = id;
  for (let i = 2; used.has(id); i++) id = `${base}-${i}`.slice(0, 40);
  used.add(id);

  const img = image(r.img);
  if (img === null) return `foto inválida em "${name}"`;

  const out: Product = { id, cat, name, desc: str(r.desc, 300), img };
  const badge = str(r.badge, 20);
  if (badge) out.badge = badge;
  const ask = str(r.ask, 60);
  if (ask) out.ask = ask;
  if (r.featured === true) out.featured = true;
  const sale = int(r.salePct ?? 0, 0, 90);
  if (sale) out.salePct = sale;
  if (r.soldOut === true) out.soldOut = true;
  if (r.soldOut === true && r.paused === true) out.paused = true; // "temporarily paused": blocked like sold out, with its own label

  if (Array.isArray(r.sizes) && r.sizes.length) {
    const sizes = r.sizes.slice(0, 4).map(size);
    if (sizes.some((s) => !s)) return `tamanho inválido em "${name}"`;
    out.sizes = sizes as Size[];
  } else {
    const price = num(r.price, 0, 99999);
    if (price === null) return `valor inválido em "${name}"`;
    out.price = price;
    const min = int(r.min, 1, 1000);
    const step = int(r.step, 1, 1000);
    if (min && min > 1) out.min = min;
    if (step && step > 1) out.step = step;
  }

  if (Array.isArray(r.extras) && r.extras.length) {
    if (r.extras.length > 8) return `"${name}": no máximo 8 grupos de adicionais`;
    const groups: ExtraGroup[] = [];
    for (let gi = 0; gi < r.extras.length; gi++) {
      const g = (r.extras[gi] && typeof r.extras[gi] === "object" ? r.extras[gi] : {}) as Record<string, unknown>;
      const gname = str(g.name, 40);
      if (!gname) return `"${name}": todo grupo de adicionais precisa de um nome`;
      const rawOpts = Array.isArray(g.options) ? g.options.slice(0, 30) : [];
      const options: ExtraOption[] = [];
      for (let oi = 0; oi < rawOpts.length; oi++) {
        const o = (rawOpts[oi] && typeof rawOpts[oi] === "object" ? rawOpts[oi] : {}) as Record<string, unknown>;
        const oname = str(o.name, 40);
        if (!oname) continue; // an empty line is just dropped
        const price = num(o.price ?? 0, 0, 999);
        if (price === null) return `"${name}": valor inválido em "${oname}"`;
        options.push({ id: `o${oi + 1}`, name: oname, price });
      }
      if (!options.length) return `"${name}": o grupo "${gname}" precisa de ao menos uma opção`;
      const max = int(g.max, 1, options.length) ?? options.length;
      const min = int(g.min ?? 0, 0, max);
      if (min === null) return `"${name}": o mínimo de "${gname}" não pode passar do máximo`;
      groups.push({ id: `g${gi + 1}`, name: gname, min, max, options });
    }
    out.extras = groups;
  }

  if (Array.isArray(r.flavors) && r.flavors.length) {
    const flavors = r.flavors.map((f) => str(f, 60)).filter(Boolean).slice(0, 60);
    if (flavors.length) out.flavors = flavors;
    const pick = int(r.pick, 1, 20);
    if (pick && flavors.length) out.pick = pick;
  }
  return out;
}

/** Returns the cleaned data, or a message in Portuguese saying what is wrong. */
export function sanitizeStore(raw: unknown, catIds: string[]): { ok: true; data: StoreData } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "dados inválidos" };
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.products) || r.products.length > 150) return { ok: false, error: "lista de produtos inválida" };
  const used = new Set<string>();
  const ids = new Set(catIds);
  const products: Product[] = [];
  for (const p of r.products) {
    const res = product(p, used, ids);
    if (typeof res === "string") return { ok: false, error: res };
    products.push(res);
  }
  return {
    ok: true,
    // the promotions have their own screen and endpoint; the route keeps the saved ones
    data: { open: r.open !== false, closedMessage: str(r.closedMessage, 200), products, promos: [], cats: [], settings: defaultSettings(), updatedAt: Date.now() },
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizePromos(raw: unknown): { ok: true; promos: Promo[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length > 40) return { ok: false, error: "lista de promoções inválida" };
  const used = new Set<string>();
  const promos: Promo[] = [];
  for (const item of raw) {
    const r = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const name = str(r.name, 60);
    if (!name) return { ok: false, error: "toda promoção precisa de um nome" };
    const percent = int(r.percent, 1, 90);
    if (percent === null) return { ok: false, error: `desconto inválido em "${name}" (use de 1 a 90%)` };
    const start = typeof r.start === "string" ? r.start : "";
    const end = typeof r.end === "string" ? r.end : "";
    if (!DATE.test(start) || !DATE.test(end) || start > end) return { ok: false, error: `datas inválidas em "${name}"` };
    const productIds = Array.isArray(r.productIds) ? [...new Set(r.productIds.map((p) => slug(str(p, 40))).filter(Boolean))].slice(0, 150) : [];
    if (!productIds.length) return { ok: false, error: `escolha ao menos um produto em "${name}"` };
    let id = slug(str(r.id, 40)) || slug(name) || "promo";
    const base = id;
    for (let i = 2; used.has(id); i++) id = `${base}-${i}`.slice(0, 40);
    used.add(id);
    promos.push({ id, name, desc: str(r.desc, 160), percent, productIds, start, end, active: r.active !== false });
  }
  return { ok: true, promos };
}

/* ------------------------------------------------------- categories & settings */

const flag = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** Categories: each needs a name; an old category that still holds products cannot be removed. */
export function sanitizeCats(raw: unknown, products: Product[]): { ok: true; cats: Cat[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || !raw.length || raw.length > 20) return { ok: false, error: "tenha de 1 a 20 categorias" };
  const used = new Set<string>();
  const cats: Cat[] = [];
  for (const item of raw) {
    const r = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const title = str(r.title, 40);
    if (!title) return { ok: false, error: "toda categoria precisa de um nome" };
    const label = str(r.label, 24) || title.slice(0, 24);
    let id = slug(str(r.id, 20)) || slug(title).slice(0, 20) || "categoria";
    const base = id;
    for (let i = 2; used.has(id); i++) id = `${base}-${i}`.slice(0, 20);
    used.add(id);
    const info = (Array.isArray(r.info) ? r.info : [])
      .slice(0, 4)
      .map((x) => {
        const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
        return { label: str(o.label, 24), value: str(o.value, 40) };
      })
      .filter((x) => x.label && x.value);
    cats.push({ id, label, title, info });
  }
  const missing = products.find((p) => !used.has(p.cat));
  if (missing) return { ok: false, error: `a categoria de "${missing.name}" foi removida; mova ou exclua os produtos dela antes` };
  return { ok: true, cats };
}

export function sanitizeSettings(raw: unknown): { ok: true; settings: Settings } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = defaultSettings();

  let wa = str(r.whatsapp, 30).replace(/\D/g, "");
  if (/^\d{10,11}$/.test(wa)) wa = "55" + wa;
  if (!/^55\d{10,11}$/.test(wa)) return { ok: false, error: "WhatsApp inválido. Use o DDD e o número, ex.: 63 99220-2561" };

  const ig = str(r.instagram, 80).replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
  if (!/^[\w.]{0,30}$/.test(ig)) return { ok: false, error: "Instagram inválido. Use só o nome de usuário." };

  const fee = num(r.deliveryFee, 0, 999);
  if (fee === null) return { ok: false, error: "taxa de entrega inválida" };

  const pickupOn = flag(r.pickupOn, true);
  const deliveryOn = flag(r.deliveryOn, true);
  if (!pickupOn && !deliveryOn) return { ok: false, error: "deixe retirada ou entrega ativada" };

  const pay = (Array.isArray(r.pay) ? r.pay : []).filter((p): p is string => typeof p === "string" && PAY.some((x) => x.id === p));
  if (!pay.length) return { ok: false, error: "deixe ao menos uma forma de pagamento ativada" };

  const img = (k: "logo" | "badge" | "banner") => image(r[k]);
  const logo = img("logo"), badge = img("badge"), banner = img("banner");
  if (logo === null || badge === null || banner === null) return { ok: false, error: "imagem inválida" };

  const sc = (r.schedule && typeof r.schedule === "object" ? r.schedule : {}) as Record<string, unknown>;
  const schedule: Schedule = { on: sc.on === true, days: defaultSchedule().days };
  if (Array.isArray(sc.days) && sc.days.length === 7) {
    for (let i = 0; i < 7; i++) {
      const o = (sc.days[i] && typeof sc.days[i] === "object" ? sc.days[i] : {}) as Record<string, unknown>;
      const open = str(o.open, 5), close = str(o.close, 5);
      const closed = o.closed === true;
      if (!closed && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(close) || open >= close))
        return { ok: false, error: `horário de ${DAY_NAMES[i].toLowerCase()} inválido: a abertura precisa ser antes do fechamento` };
      schedule.days[i] = { closed, open: /^\d{2}:\d{2}$/.test(open) ? open : "08:00", close: /^\d{2}:\d{2}$/.test(close) ? close : "18:00" };
    }
  }

  const text = (k: keyof Settings, max: number) => str(r[k], max) || (k === "hours" || k === "deliveryNote" || k === "address" ? "" : (d[k] as string));
  return {
    ok: true,
    settings: {
      whatsapp: wa,
      instagram: ig,
      tagline: text("tagline", 80),
      description: text("description", 300),
      hours: text("hours", 200),
      pickupOn, deliveryOn, deliveryFee: fee,
      deliveryNote: text("deliveryNote", 160),
      pay: PAY.filter((p) => pay.includes(p.id)).map((p) => p.id),
      menuHint: text("menuHint", 200),
      menuNote: text("menuNote", 200),
      ctaTitle: text("ctaTitle", 80),
      ctaText: text("ctaText", 200),
      logo, badge, banner,
      name: text("name", 60),
      address: text("address", 160),
      schedule,
    },
  };
}