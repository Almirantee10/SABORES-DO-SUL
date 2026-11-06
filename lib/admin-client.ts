/** Small helpers the admin screen uses to talk to the server. */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, method: "GET" | "POST" | "PUT", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    cache: "no-store",
    headers: { "x-requested-with": "sds", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new ApiError((data as { error?: string } | null)?.error || "Algo deu errado. Tente de novo.", res.status);
  return data as T;
}

/** Shrinks a phone photo to a web-sized JPEG (long side 1200 px) before it is uploaded. */
export async function toJpeg(file: File, maxSide = 1200): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a foto.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Não foi possível preparar a foto.");
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

export async function uploadPhoto(file: File): Promise<string> {
  const jpeg = await toJpeg(file);
  const form = new FormData();
  form.append("file", jpeg);
  const res = await fetch("/api/admin/upload", { method: "POST", headers: { "x-requested-with": "sds" }, body: form });
  let data: { url?: string; error?: string } = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data.url) throw new ApiError(data.error || "Não foi possível enviar a foto.", res.status);
  return data.url;
}

/** "12,50" or "12.5" -> 12.5; null if it is not a number. */
export function parseMoney(s: string): number | null {
  const t = s.trim().replace(/^R\$\s*/i, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export const moneyText = (n: number | undefined) => (n === undefined ? "" : n.toFixed(2).replace(".", ","));
