const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export interface WikilinkMatch {
  target: string;
  alias?: string;
}

function normalizeTarget(target: string): string {
  const trimmed = target.trim().replace(/^\.\//, "");
  return trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
}

function normalizePosixPath(pathValue: string): string {
  const stack: string[] = [];
  for (const part of pathValue.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

/** Extrae los wikilinks `[[doc]]` o `[[doc|alias]]` presentes en un contenido markdown. */
export function extractWikilinks(content: string): WikilinkMatch[] {
  return Array.from(content.matchAll(WIKILINK_RE), ([, target, alias]) => ({
    target: target.trim(),
    alias: alias?.trim(),
  }));
}

/**
 * Convierte los wikilinks a enlaces markdown estándar con esquema `wikilink:`,
 * para que el renderer de preview los distinga de enlaces normales y los resuelva.
 */
export function wikilinksToMarkdown(content: string): string {
  return content.replace(WIKILINK_RE, (_match, target: string, alias?: string) => {
    const label = (alias ?? target).trim();
    return `[${label}](wikilink:${encodeURIComponent(target.trim())})`;
  });
}

/**
 * Resuelve un `href` de un enlace ya renderizado (wikilink o markdown normal) contra el
 * conjunto de documentos existentes.
 * - `undefined`: enlace externo o no dirigido a un documento del atlas (no se toca).
 * - `null`: enlace interno pero roto (el documento de destino no existe).
 * - `string`: ruta relativa (dentro de CONTENT_DIR) del documento de destino.
 */
export function resolveMarkdownHref(
  href: string,
  fromDocPath: string,
  docPaths: ReadonlySet<string>,
): string | null | undefined {
  if (href.startsWith("wikilink:")) {
    const target = decodeURIComponent(href.slice("wikilink:".length));
    const normalized = normalizeTarget(target);
    return docPaths.has(normalized) ? normalized : null;
  }

  if (/^[a-z]+:/i.test(href) || href.startsWith("#")) {
    return undefined;
  }

  if (!href.endsWith(".md")) {
    return undefined;
  }

  const baseDir = fromDocPath.includes("/")
    ? fromDocPath.slice(0, fromDocPath.lastIndexOf("/"))
    : "";
  const combined = href.startsWith("/") ? href.slice(1) : `${baseDir ? `${baseDir}/` : ""}${href}`;
  const normalized = normalizePosixPath(combined);
  return docPaths.has(normalized) ? normalized : null;
}

/** Calcula, para cada documento de destino, la lista (ordenada) de documentos que enlazan hacia él. */
export function computeBacklinks(
  docs: { path: string; content: string }[],
): Map<string, string[]> {
  const existingPaths = new Set(docs.map((doc) => doc.path));
  const backlinks = new Map<string, Set<string>>();

  for (const doc of docs) {
    for (const { target } of extractWikilinks(doc.content)) {
      const normalized = normalizeTarget(target);
      if (!existingPaths.has(normalized) || normalized === doc.path) continue;
      if (!backlinks.has(normalized)) backlinks.set(normalized, new Set());
      backlinks.get(normalized)!.add(doc.path);
    }
  }

  const result = new Map<string, string[]>();
  for (const [target, sources] of backlinks) {
    result.set(target, Array.from(sources).sort());
  }
  return result;
}

/** Backlinks de un único documento (atajo sobre `computeBacklinks`). */
export function backlinksFor(
  targetPath: string,
  docs: { path: string; content: string }[],
): string[] {
  return computeBacklinks(docs).get(targetPath) ?? [];
}
