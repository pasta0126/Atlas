import { NextResponse } from "next/server";
import { diff } from "@/lib/git";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to") ?? undefined;

  if (!from) {
    return NextResponse.json({ error: "Falta el parámetro 'from'" }, { status: 400 });
  }

  const patch = await diff(segments.join("/"), from, to);
  return NextResponse.json({ diff: patch });
}
