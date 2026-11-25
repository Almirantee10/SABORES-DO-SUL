import { clearFails, clientIp, isAdmin, recordFail, sameOrigin, startSession, throttled } from "@/lib/server/auth";
import { checkPassword, saveCredentials } from "@/lib/server/credentials";
import { ordersConfigured } from "@/lib/server/orders";

/** Admin: changes the login (user and/or password). Needs the current password. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });
  const ip = clientIp(req);
  if (throttled(ip)) return Response.json({ error: "Muitas tentativas. Tente de novo em alguns minutos." }, { status: 429 });

  let body: { current?: unknown; user?: unknown; password?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "dados inválidos" }, { status: 400 });
  }
  const current = typeof body.current === "string" ? body.current.slice(0, 200) : "";
  const user = typeof body.user === "string" ? body.user.trim().slice(0, 40) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 100) : "";

  if (!(await checkPassword(current))) {
    recordFail(ip);
    return Response.json({ error: "A senha atual não confere." }, { status: 403 });
  }
  clearFails(ip);
  if (user.length < 3) return Response.json({ error: "O usuário precisa ter ao menos 3 letras." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "A nova senha precisa ter ao menos 8 caracteres." }, { status: 400 });
  if (!ordersConfigured()) return Response.json({ error: "Não é possível salvar o login: falta a chave ORDERS_KEY na Vercel." }, { status: 503 });

  try {
    await saveCredentials(user, password);
    await startSession(); // keeps this browser signed in; every other session ends
    return Response.json({ ok: true, user });
  } catch {
    return Response.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
}
