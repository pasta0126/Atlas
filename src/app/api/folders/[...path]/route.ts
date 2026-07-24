import { NextResponse } from "next/server";
import { deleteFolder } from "@/lib/fs";
import { commitChange } from "@/lib/git";
import { PathTraversalError } from "@/lib/paths";
import { invalidateSearchIndex } from "@/lib/search-index";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";

  const relativePath = segments.join("/");
  try {
    await deleteFolder(relativePath, { force });
    await commitChange(relativePath, `eliminar carpeta: ${relativePath}`);
    invalidateSearchIndex();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && /no está vacía/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "No se ha podido eliminar la carpeta" }, { status: 404 });
  }
}
