import { get, put } from "@vercel/blob";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ordersConfigured, seal, unseal } from "@/lib/server/orders";

/*
 * The owner can change the login from the panel. The new user and password hash are kept encrypted
 * (same key as the orders, because the Blob store is public). While nothing is saved, the
 * ADMIN_USER / ADMIN_PASSWORD variables keep working. To go back to them, delete admin.dat from the Blob store.
 */

type Override = { user: string; salt: string; hash: string };
const KEY = "admin.dat";
const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL = path.join(process.cwd(), ".data", "admin.dat");

let cache: { at: number; value: Override | null } | null = null;

async function read(): Promise<Override | null> {
  if (cache && Date.now() - cache.at < 10_000) return cache.value;
  let raw = "";
  if (hasBlob()) {
    const r = await get(KEY, { access: "public", useCache: false });
    if (r && r.statusCode === 200) raw = await new Response(r.stream).text();
  } else {
    try {
      raw = await fs.readFile(LOCAL, "utf8");
    } catch {
      raw = "";
    }
  }
  let value: Override | null = null;
  if (raw && ordersConfigured()) {
    try {
      const o = JSON.parse(unseal(raw)) as Override;
      if (o.user && o.salt && o.hash) value = o;
    } catch {
      value = null; // unreadable (the key changed): fall back to the variables
    }
  }
  cache = { at: Date.now(), value };
  return value;
}

const hashOf = (password: string, salt: string) => scryptSync(password, salt, 32).toString("base64url");

export async function effectiveUser(): Promise<string> {
  return (await read())?.user ?? (process.env.ADMIN_USER as string);
}

/** Part of the session signing key: changes whenever the password changes. */
export async function overrideKey(): Promise<string> {
  return (await read())?.hash ?? "";
}

export async function checkPassword(password: string): Promise<boolean> {
  const o = await read();
  if (!o) {
    const a = Buffer.from(scryptSync(password, "sds", 32));
    const b = Buffer.from(scryptSync(process.env.ADMIN_PASSWORD as string, "sds", 32));
    return timingSafeEqual(a, b);
  }
  return timingSafeEqual(Buffer.from(hashOf(password, o.salt)), Buffer.from(o.hash));
}

export async function saveCredentials(user: string, password: string): Promise<void> {
  if (!ordersConfigured()) throw new Error("chave de criptografia não configurada");
  const salt = randomBytes(16).toString("base64url");
  const value: Override = { user, salt, hash: hashOf(password, salt) };
  const body = seal(JSON.stringify(value));
  if (hasBlob()) {
    await put(KEY, body, { access: "public", contentType: "text/plain", allowOverwrite: true, addRandomSuffix: false, cacheControlMaxAge: 0 });
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("armazenamento não configurado");
    await fs.mkdir(path.dirname(LOCAL), { recursive: true });
    await fs.writeFile(LOCAL, body, "utf8");
  }
  cache = { at: Date.now(), value };
}
