import { NextResponse } from "next/server";
import { folderExists } from "@/lib/fs";
import { commitChange } from "@/lib/git";
import { boardFilePath, isKanbanFolder, readBoard, writeBoard } from "@/lib/kanban";
import { PathTraversalError } from "@/lib/paths";
import type { KanbanBoard } from "@/types/kanban";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

function isValidBoard(value: unknown): value is KanbanBoard {
  if (typeof value !== "object" || value === null) return false;
  const board = value as KanbanBoard;
  return (
    Array.isArray(board.columns) &&
    board.columns.every(
      (column) =>
        typeof column.id === "string" &&
        typeof column.name === "string" &&
        Array.isArray(column.cards) &&
        column.cards.every(
          (card) =>
            typeof card.id === "string" &&
            typeof card.title === "string" &&
            typeof card.description === "string" &&
            typeof card.createdAt === "string" &&
            Array.isArray(card.tags),
        ),
    )
  );
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");

  if (!isKanbanFolder(relativePath)) {
    return NextResponse.json({ error: "No es una carpeta kanban" }, { status: 400 });
  }

  try {
    if (!(await folderExists(relativePath))) {
      return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
    }
    const board = await readBoard(relativePath);
    return NextResponse.json({ board });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se ha podido leer el tablero" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");

  if (!isKanbanFolder(relativePath)) {
    return NextResponse.json({ error: "No es una carpeta kanban" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!isValidBoard(body?.board)) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    await writeBoard(relativePath, body.board);
    await commitChange(boardFilePath(relativePath), `kanban: ${relativePath}`);
    return NextResponse.json({ board: body.board });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "No se ha podido guardar el tablero" }, { status: 500 });
  }
}
