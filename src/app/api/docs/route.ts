import { NextResponse } from "next/server";
import { createDocument } from "@/lib/fs";
import { commitChange } from "@/lib/git";
import { PathTraversalError } from "@/lib/paths";
import { invalidateSearchIndex } from "@/lib/search-index";
import { slugify } from "@/lib/slug";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const folder = body?.folder;
  const titulo = body?.titulo;

  if (typeof folder !== "string" || typeof titulo !== "string" || titulo.trim() === "") {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const slug = slugify(titulo);
  if (slug === "") {
    return NextResponse.json({ error: "El título no produce un nombre válido" }, { status: 400 });
  }

  const relativePath = folder === "." ? `${slug}.md` : `${folder}/${slug}.md`;

  try {
    const document = await createDocument(relativePath, titulo);
    await commitChange(relativePath, `crear: ${relativePath}`);
    invalidateSearchIndex();
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && /ya existe/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "No se ha podido crear el documento" }, { status: 500 });
  }
}
