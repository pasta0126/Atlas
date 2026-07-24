import { NextResponse } from "next/server";
import { createFolder } from "@/lib/fs";
import { PathTraversalError } from "@/lib/paths";
import { slugify } from "@/lib/slug";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parent = body?.parent;
  const nombre = body?.nombre;

  if (typeof parent !== "string" || typeof nombre !== "string" || nombre.trim() === "") {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const slug = slugify(nombre);
  if (slug === "") {
    return NextResponse.json({ error: "El nombre no produce una ruta válida" }, { status: 400 });
  }

  const relativePath = parent === "." ? slug : `${parent}/${slug}`;

  try {
    await createFolder(relativePath);
    return NextResponse.json({ ok: true, path: relativePath }, { status: 201 });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && /ya existe/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "No se ha podido crear la carpeta" }, { status: 500 });
  }
}
