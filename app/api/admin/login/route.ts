import { adminConfigured, checkLogin, clearFails, clientIp, recordFail, sameOrigin, startSession, throttled } from "@/lib/server/auth";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!adminConfigured()) return Response.json({ error: "Acesso administrativo ainda não configurado." }, { status: 503 });

  const ip = clientIp(req);
  if (throttled(ip)) return Response.json({ error: "Muitas tentativas. Tente de novo em alguns minutos." }, { status: 429 });

  let body: { user?: unknown; password?: unknown } = {};
  try {
    body = await req.json();
  } catch {}
  const user = typeof body.user === "string" ? body.user.slice(0, 100) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";

  if (!checkLogin(user, password)) {
    recordFail(ip);
    await wait(800);
    return Response.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }
  clearFails(ip);
  await startSession();
  return Response.json({ ok: true });
}

