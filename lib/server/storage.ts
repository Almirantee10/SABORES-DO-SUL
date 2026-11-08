import { get, put } from "@vercel/blob";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { defaultStore, withDescUpdates, type StoreData } from "@/lib/store-data";

const KEY = "store.json";
const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL = path.join(process.cwd(), ".data", "store.json");

/** Reads the saved menu; before anything is saved it falls back to the menu shipped with the site. */
export async function readStore(): Promise<StoreData> {
  if (hasBlob()) {
    const res = await get(KEY, { access: "public", useCache: false });
    if (!res || res.statusCode !== 200) return defaultStore();
    return withDescUpdates((await new Response(res.stream).json()) as StoreData);
  }
  try {
    return withDescUpdates(JSON.parse(await fs.readFile(LOCAL, "utf8")) as StoreData);
  } catch {
    return defaultStore();
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  const body = JSON.stringify(data);
  if (hasBlob()) {
    await put(KEY, body, { access: "public", contentType: "application/json", allowOverwrite: true, addRandomSuffix: false, cacheControlMaxAge: 60 });
    return;
  }
  if (process.env.NODE_ENV === "production") throw new Error("armazenamento não configurado");
  await fs.mkdir(path.dirname(LOCAL), { recursive: true });
  await fs.writeFile(LOCAL, body, "utf8");
}

/** Stores a product photo and returns the address to show it from. */
export async function saveImage(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (hasBlob()) {
    const out = await put(`products/${randomBytes(6).toString("hex")}.jpg`, bytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: false });
    return out.url;
  }
  if (process.env.NODE_ENV === "production") throw new Error("armazenamento não configurado");
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}
