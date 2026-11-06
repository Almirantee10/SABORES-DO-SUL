import { endSession, sameOrigin } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  await endSession();
  return Response.json({ ok: true });
}

