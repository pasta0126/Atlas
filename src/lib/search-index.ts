import MiniSearch from "minisearch";
import { readAllDocumentsParsed } from "./fs";

export interface SearchResult {
  path: string;
  title: string;
  score: number;
  snippet: string;
}

interface IndexedDoc {
  id: string;
  path: string;
  title: string;
  content: string;
}

// Índice en memoria, sin BD externa (ver specs/02-design.md §1). No se mantiene
// de forma incrementalmente exacta: cualquier escritura lo invalida y se
// reconstruye entero, de forma perezosa, en la siguiente búsqueda — para el
// volumen de un atlas personal es instantáneo y evita duplicar la lógica de
// altas/bajas/renombrados que ya vive en lib/fs.ts.
let cachedIndex: MiniSearch<IndexedDoc> | null = null;

function buildSnippet(content: string, query: string): string {
  const plain = content.replace(/\s+/g, " ").trim();
  const lower = plain.toLowerCase();
  const matchIndex = lower.indexOf(query.toLowerCase());

  if (matchIndex === -1) {
    return plain.slice(0, 160);
  }

  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(plain.length, matchIndex + query.length + 60);
  return `${start > 0 ? "…" : ""}${plain.slice(start, end)}${end < plain.length ? "…" : ""}`;
}

async function buildIndex(): Promise<MiniSearch<IndexedDoc>> {
  const docs = await readAllDocumentsParsed();
  const index = new MiniSearch<IndexedDoc>({
    fields: ["title", "path", "content"],
    storeFields: ["path", "title", "content"],
    searchOptions: { boost: { title: 3, path: 1.5 }, prefix: true, fuzzy: 0.2 },
  });
  index.addAll(
    docs.map((doc) => ({
      id: doc.path,
      path: doc.path,
      title: doc.frontmatter.titulo ?? doc.path,
      content: doc.content,
    })),
  );
  return index;
}

/** Invalida el índice en memoria; se reconstruye de forma perezosa en la siguiente búsqueda. */
export function invalidateSearchIndex(): void {
  cachedIndex = null;
}

async function getIndex(): Promise<MiniSearch<IndexedDoc>> {
  if (!cachedIndex) {
    cachedIndex = await buildIndex();
  }
  return cachedIndex;
}

export async function searchDocuments(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const index = await getIndex();
  return index.search(trimmed).map((result) => ({
    path: String(result.path),
    title: String(result.title),
    score: result.score,
    snippet: buildSnippet(String(result.content), trimmed),
  }));
}
