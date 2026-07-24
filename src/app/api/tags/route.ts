import { NextResponse } from "next/server";
import { listTags } from "@/lib/tags";

export async function GET() {
  const tags = await listTags();
  return NextResponse.json(tags);
}
