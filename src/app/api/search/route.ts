import { NextResponse } from "next/server";
import { searchDocuments } from "@/lib/search-index";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchDocuments(query);
  return NextResponse.json(results);
}
