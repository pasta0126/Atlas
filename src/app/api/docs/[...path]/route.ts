import { NextResponse } from "next/server";
import { deleteDocument, getDocument, upsertDocument } from "@/lib/fs";
import { commitChange } from "@/lib/git";
import { PathTraversalError } from "@/lib/paths";
import type { Frontmatter } from "@/types/atlas";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

function toRelativePath(segments: string[]): string {
  return segments.join("/");
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  try {
    const document = await getDocument(toRelativePath(segments));
    return NextResponse.json(document);
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const body = await request.json().catch(() => null);
  const frontmatter = body?.frontmatter as Frontmatter | undefined;
  const content = body?.content;

  if (typeof content !== "string" || typeof frontmatter !== "object" || frontmatter === null) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    const relativePath = toRelativePath(segments);
    const document = await upsertDocument(relativePath, frontmatter, content);
    await commitChange(relativePath, `editar: ${relativePath}`);
    return NextResponse.json(document);
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se ha podido guardar el documento" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  try {
    const relativePath = toRelativePath(segments);
    await deleteDocument(relativePath);
    await commitChange(relativePath, `eliminar: ${relativePath}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se ha podido eliminar el documento" }, { status: 404 });
  }
}
