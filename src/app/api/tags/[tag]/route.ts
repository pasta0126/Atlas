import { NextResponse } from "next/server";
import { listDocumentsByTag } from "@/lib/tags";

interface RouteParams {
  params: Promise<{ tag: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { tag } = await params;
  const documents = await listDocumentsByTag(decodeURIComponent(tag));
  return NextResponse.json(documents);
}
