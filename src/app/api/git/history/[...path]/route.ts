import { NextResponse } from "next/server";
import { history } from "@/lib/git";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const commits = await history(segments.join("/"));
  return NextResponse.json(commits);
}
