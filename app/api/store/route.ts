import { connection } from "next/server";
import { readStore } from "@/lib/server/storage";
import { defaultStore } from "@/lib/store-data";

/** Public: the menu and whether the shop is open. */
export async function GET() {
  await connection(); // always read the latest saved menu, never a prerendered copy
  let data;
  try {
    data = await readStore();
  } catch {
    data = defaultStore();
  }
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

