import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { saveImage } from "@/lib/server/storage";

const MAX = 3 * 1024 * 1024; // the admin screen shrinks photos first, so real files are far smaller

/** Admin: uploads one product photo (already resized to JPEG by the admin screen). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let file: FormDataEntryValue | null = null;
  try {
    file = (await req.formData()).get("file");
  } catch {}
  if (!(file instanceof File)) return Response.json({ error: "Escolha uma foto." }, { status: 400 });
  if (file.type !== "image/jpeg") return Response.json({ error: "Formato de foto não aceito." }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "A foto é grande demais." }, { status: 413 });

  // a real JPEG starts with FF D8 FF
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) return Response.json({ error: "Arquivo não é uma foto válida." }, { status: 400 });

  try {
    return Response.json({ url: await saveImage(file) });
  } catch {
    return Response.json({ error: "Não foi possível enviar a foto." }, { status: 500 });
  }
}

