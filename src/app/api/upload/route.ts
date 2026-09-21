import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/fs";
import { commitChange } from "@/lib/git";
import { PathTraversalError } from "@/lib/paths";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const folder = formData?.get("folder");
  const file = formData?.get("file");

  if (typeof folder !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const relativePath = await saveUploadedFile(folder, file.name, buffer);
    await commitChange(relativePath, `subir: ${relativePath}`);
    return NextResponse.json({ path: relativePath }, { status: 201 });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se ha podido subir el fichero" }, { status: 500 });
  }
}
