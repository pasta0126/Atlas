import { NextResponse } from "next/server";
import { readBinaryFile } from "@/lib/plain-files";
import { imageMimeType } from "@/lib/file-kind";
import { PathTraversalError } from "@/lib/paths";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");
  const mimeType = imageMimeType(relativePath);
  if (!mimeType) {
    return NextResponse.json({ error: "Tipo de fichero no soportado" }, { status: 400 });
  }

  try {
    const buffer = await readBinaryFile(relativePath);
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": mimeType } });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Fichero no encontrado" }, { status: 404 });
  }
}
