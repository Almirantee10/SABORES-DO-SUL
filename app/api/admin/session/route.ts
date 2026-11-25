import { connection } from "next/server";
import { adminConfigured, isAdmin } from "@/lib/server/auth";
import { effectiveUser } from "@/lib/server/credentials";

export async function GET() {
  await connection();
  const authenticated = await isAdmin();
  return Response.json(
    { configured: adminConfigured(), authenticated, ...(authenticated ? { user: await effectiveUser() } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

