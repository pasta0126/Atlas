import { NextResponse } from "next/server";
import { readTree } from "@/lib/fs";

export async function GET() {
  const tree = await readTree();
  return NextResponse.json(tree);
}
