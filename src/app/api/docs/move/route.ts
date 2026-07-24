import { NextResponse } from "next/server";
import { movePath } from "@/lib/fs";
import { commitChange } from "@/lib/git";
import { PathTraversalError } from "@/lib/paths";
import { invalidateSearchIndex } from "@/lib/search-index";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const from = body?.from;
  const to = body?.to;

  if (typeof from !== "string" || typeof to !== "string" || from === "" || to === "") {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    await movePath(from, to);
    await commitChange([from, to], `mover: ${from} -> ${to}`);
    invalidateSearchIndex();
    return NextResponse.json({ ok: true, path: to });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && /destino/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "No se ha podido mover" }, { status: 500 });
  }
}
