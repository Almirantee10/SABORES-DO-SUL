import { isAdmin, sameOrigin } from "@/lib/server/auth";
import { saveImage } from "@/lib/server/storage";

const MAX = 3 * 1024 * 1024; // the admin screen shrinks photos first, so real files are far smaller

/** Admin: uploads one product photo (already resized to JPEG by the admin screen). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "pedido não permitido" }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Entre novamente." }, { status: 401 });

  let file: FormDataEntryValue | null = null;
  let png = false;
  try {
    const form = await req.formData();
    file = form.get("file");
    png = form.get("kind") === "png"; // logos keep their transparent background
  } catch {}
  if (!(file instanceof File)) return Response.json({ error: "Escolha uma foto." }, { status: 400 });
  if (file.type !== (png ? "image/png" : "image/jpeg")) return Response.json({ error: "Formato de foto não aceito." }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "A foto é grande demais." }, { status: 413 });

  // a real JPEG starts with FF D8 FF, a real PNG with 89 50 4E 47
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const okHead = png ? head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 : head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (!okHead) return Response.json({ error: "Arquivo não é uma foto válida." }, { status: 400 });

  try {
    return Response.json({ url: await saveImage(file, png) });
  } catch {
    return Response.json({ error: "Não foi possível enviar a foto." }, { status: 500 });
  }
}

