import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveContentPath } from "./paths";
import type { KanbanBoard, KanbanCard, KanbanColumn } from "@/types/kanban";

const BOARD_FILE = "board.md";
const ID_COMMENT = /<!--\s*id:([a-zA-Z0-9_-]+)\s*-->/;
const DEFAULT_COLUMN_NAMES = ["Por hacer", "En progreso", "Hecho"];

function shortId(): string {
  return randomUUID().slice(0, 8);
}

/** Una carpeta llamada "kanban" (sin importar mayúsculas) es un tablero. */
export function isKanbanFolder(relativePath: string): boolean {
  return path.basename(relativePath).toLowerCase() === "kanban";
}

export function boardFilePath(folderRelativePath: string): string {
  return folderRelativePath === "." ? BOARD_FILE : `${folderRelativePath}/${BOARD_FILE}`;
}

export function defaultBoard(): KanbanBoard {
  return {
    columns: DEFAULT_COLUMN_NAMES.map((name) => ({ id: shortId(), name, cards: [] })),
  };
}

function stripId(heading: string): { text: string; id?: string } {
  const match = heading.match(ID_COMMENT);
  const text = heading.replace(ID_COMMENT, "").trim();
  return { text, id: match?.[1] };
}

function parseCardBody(lines: string[]): Omit<KanbanCard, "id" | "title"> {
  let i = 0;
  let createdAt = "";
  let dueDate: string | undefined;
  let tags: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const metaMatch = line.match(/^(creado|vence|tags):\s*(.*)$/i);
    if (!metaMatch) break;
    const [, key, value] = metaMatch;
    if (/^creado$/i.test(key)) createdAt = value.trim();
    else if (/^vence$/i.test(key)) dueDate = value.trim() || undefined;
    else if (/^tags$/i.test(key)) {
      tags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");
    }
    i += 1;
  }

  const description = lines.slice(i).join("\n").trim();
  return { description, createdAt, dueDate, tags };
}

/** Parsea un `board.md` (columnas = "## ", tarjetas = "### ", ver serializeBoard). */
export function parseBoard(raw: string): KanbanBoard {
  const lines = raw.split(/\r?\n/);
  const columns: KanbanColumn[] = [];
  let currentColumn: KanbanColumn | null = null;
  let currentCardHeading: string | null = null;
  let currentCardLines: string[] = [];

  function flushCard() {
    if (currentColumn && currentCardHeading !== null) {
      const { text, id } = stripId(currentCardHeading);
      const { description, createdAt, dueDate, tags } = parseCardBody(currentCardLines);
      currentColumn.cards.push({
        id: id ?? shortId(),
        title: text,
        description,
        createdAt: createdAt || new Date().toISOString().slice(0, 10),
        dueDate,
        tags,
      });
    }
    currentCardHeading = null;
    currentCardLines = [];
  }

  for (const line of lines) {
    const colMatch = line.match(/^##\s+(.*)$/);
    const cardMatch = line.match(/^###\s+(.*)$/);
    if (colMatch) {
      flushCard();
      const { text, id } = stripId(colMatch[1]);
      currentColumn = { id: id ?? shortId(), name: text, cards: [] };
      columns.push(currentColumn);
    } else if (cardMatch) {
      flushCard();
      currentCardHeading = cardMatch[1];
    } else if (currentCardHeading !== null) {
      currentCardLines.push(line);
    }
  }
  flushCard();

  return { columns };
}

function serializeCard(card: KanbanCard): string {
  const metaLines = [`creado: ${card.createdAt}`];
  if (card.dueDate) metaLines.push(`vence: ${card.dueDate}`);
  if (card.tags.length > 0) metaLines.push(`tags: ${card.tags.join(", ")}`);

  const parts = [`### ${card.title} <!-- id:${card.id} -->`, metaLines.join("\n")];
  if (card.description.trim() !== "") parts.push(card.description.trim());
  return parts.join("\n\n");
}

/** Serializa el tablero al formato de texto de `board.md` (editable a mano). */
export function serializeBoard(board: KanbanBoard): string {
  return (
    board.columns
      .map((column) => {
        const header = `## ${column.name} <!-- id:${column.id} -->`;
        if (column.cards.length === 0) return header;
        return [header, ...column.cards.map(serializeCard)].join("\n\n");
      })
      .join("\n\n") + "\n"
  );
}

export async function readBoard(folderRelativePath: string): Promise<KanbanBoard> {
  const absolutePath = resolveContentPath(boardFilePath(folderRelativePath));
  try {
    const raw = await fsp.readFile(absolutePath, "utf-8");
    return parseBoard(raw);
  } catch {
    return defaultBoard();
  }
}

export async function writeBoard(folderRelativePath: string, board: KanbanBoard): Promise<void> {
  const absolutePath = resolveContentPath(boardFilePath(folderRelativePath));
  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, serializeBoard(board), "utf-8");
}
