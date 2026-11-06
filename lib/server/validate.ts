import { CATS, type Product, type Size } from "@/lib/data";
import type { StoreData } from "@/lib/store-data";

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
  if (process.env.NODE_ENV !== "production" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 600_000) return s;
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

function product(raw: unknown, used: Set<string>): Product | string {
  if (!raw || typeof raw !== "object") return "produto inválido";
  const r = raw as Record<string, unknown>;
  const name = str(r.name, 80);
  if (!name) return "todo produto precisa de nome";
  const cat = str(r.cat, 20);
  if (!CATS.some((c) => c.id === cat)) return `categoria inválida em "${name}"`;

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
  if (r.soldOut === true) out.soldOut = true;

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

  if (Array.isArray(r.flavors) && r.flavors.length) {
    const flavors = r.flavors.map((f) => str(f, 60)).filter(Boolean).slice(0, 60);
    if (flavors.length) out.flavors = flavors;
    const pick = int(r.pick, 1, 20);
    if (pick && flavors.length) out.pick = pick;
  }
  return out;
}

/** Returns the cleaned data, or a message in Portuguese saying what is wrong. */
export function sanitizeStore(raw: unknown): { ok: true; data: StoreData } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "dados inválidos" };
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.products) || r.products.length > 150) return { ok: false, error: "lista de produtos inválida" };
  const used = new Set<string>();
  const products: Product[] = [];
  for (const p of r.products) {
    const res = product(p, used);
    if (typeof res === "string") return { ok: false, error: res };
    products.push(res);
  }
  return {
    ok: true,
    data: { open: r.open !== false, closedMessage: str(r.closedMessage, 200), products, updatedAt: Date.now() },
  };
}
