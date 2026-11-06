import { connection } from "next/server";
import { adminConfigured, isAdmin } from "@/lib/server/auth";

export async function GET() {
  await connection();
  return Response.json(
    { configured: adminConfigured(), authenticated: await isAdmin() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

