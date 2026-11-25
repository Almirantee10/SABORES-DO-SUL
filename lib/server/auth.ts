import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { checkPassword, effectiveUser, overrideKey } from "@/lib/server/credentials";

const COOKIE = "sds_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

export const adminConfigured = () => !!(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);

const digest = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/** The signing key comes from the admin password, so changing the password signs everyone out. */
const key = async () => createHash("sha256").update(`sds-admin|${process.env.ADMIN_PASSWORD}|${await overrideKey()}|${process.env.BLOB_READ_WRITE_TOKEN ?? ""}`).digest();
const sign = async (payload: string) => createHmac("sha256", await key()).update(payload).digest("base64url");

export async function checkLogin(user: string, password: string): Promise<boolean> {
  if (!adminConfigured()) return false;
  // evaluate both so the time taken does not reveal which one was wrong
  const u = same(user, await effectiveUser());
  const p = await checkPassword(password);
  return u && p;
}

export async function startSession() {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = String(exp);
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [payload, sig] = v.split(".");
  if (!payload || !sig) return false;
  const expected = await sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(payload) > Date.now();
}

/** Mutating requests must come from our own pages. */
export function sameOrigin(req: Request): boolean {
  if (req.headers.get("x-requested-with") !== "sds") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/* login attempts: a handful per address, then a pause (best effort, per server instance) */
const fails = new Map<string, { n: number; until: number }>();
export function throttled(ip: string): boolean {
  const f = fails.get(ip);
  return !!f && f.n >= 5 && f.until > Date.now();
}
export function recordFail(ip: string) {
  const f = fails.get(ip);
  const n = f && f.until > Date.now() ? f.n + 1 : 1;
  fails.set(ip, { n, until: Date.now() + 10 * 60 * 1000 });
}
export function clearFails(ip: string) {
  fails.delete(ip);
}
export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
