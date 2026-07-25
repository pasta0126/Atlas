import { NextResponse } from "next/server";
import { readTextFile, writeTextFile } from "@/lib/plain-files";
import { commitChange } from "@/lib/git";
import { PathTraversalError } from "@/lib/paths";
import { invalidateSearchIndex } from "@/lib/search-index";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

function toRelativePath(segments: string[]): string {
  return segments.join("/");
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const relativePath = toRelativePath(segments);
  try {
    const content = await readTextFile(relativePath);
    return NextResponse.json({ path: relativePath, content });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Fichero no encontrado" }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const body = await request.json().catch(() => null);
  const content = body?.content;

  if (typeof content !== "string") {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const relativePath = toRelativePath(segments);
  try {
    await writeTextFile(relativePath, content);
    await commitChange(relativePath, `editar: ${relativePath}`);
    invalidateSearchIndex();
    return NextResponse.json({ path: relativePath, content });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se ha podido guardar el fichero" }, { status: 500 });
  }
}
