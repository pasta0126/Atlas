import fsp from "node:fs/promises";
import path from "node:path";
import { resolveContentPath, toRelativePath } from "./paths";
import { parseFrontmatter, serializeFrontmatter, documentTemplate } from "./frontmatter";
import type { AtlasNode, AtlasDocument, Frontmatter } from "@/types/atlas";

const MARKDOWN_EXT = ".md";
const INDEX_FILE = "index.md";

function humanize(name: string): string {
  const withoutExt = name.endsWith(MARKDOWN_EXT)
    ? name.slice(0, -MARKDOWN_EXT.length)
    : name;
  return withoutExt.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await fsp.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function readFrontmatterTitle(absolutePath: string): Promise<string | undefined> {
  try {
    const raw = await fsp.readFile(absolutePath, "utf-8");
    return parseFrontmatter(raw).frontmatter.titulo;
  } catch {
    return undefined;
  }
}

/** Construye el árbol de navegación (temas → subcategorías → documentos) leyendo CONTENT_DIR. */
export async function readTree(relativePath = "."): Promise<AtlasNode> {
  return buildNode(resolveContentPath(relativePath));
}

async function buildNode(absolutePath: string): Promise<AtlasNode> {
  const stat = await fsp.stat(absolutePath);
  const relativePath = toRelativePath(absolutePath) || ".";

  if (!stat.isDirectory()) {
    const title =
      (await readFrontmatterTitle(absolutePath)) ?? humanize(path.basename(absolutePath));
    return { path: relativePath, type: "document", title };
  }

  const entries = await fsp.readdir(absolutePath, { withFileTypes: true });
  const indexTitle = await readFrontmatterTitle(path.join(absolutePath, INDEX_FILE));

  const children: AtlasNode[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".") || entry.name === INDEX_FILE) continue;
    if (entry.isDirectory() || (entry.isFile() && entry.name.endsWith(MARKDOWN_EXT))) {
      children.push(await buildNode(path.join(absolutePath, entry.name)));
    }
  }

  return {
    path: relativePath,
    type: "folder",
    title: indexTitle ?? humanize(path.basename(absolutePath)),
    children,
  };
}

export async function getDocument(relativePath: string): Promise<AtlasDocument> {
  const absolutePath = resolveContentPath(relativePath);
  const raw = await fsp.readFile(absolutePath, "utf-8");
  const { frontmatter, content } = parseFrontmatter(raw);
  return { path: toRelativePath(absolutePath), frontmatter, content };
}

export async function createDocument(
  relativePath: string,
  titulo: string,
): Promise<AtlasDocument> {
  const absolutePath = resolveContentPath(relativePath);
  if (await pathExists(absolutePath)) {
    throw new Error(`El documento ya existe: ${relativePath}`);
  }
  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, documentTemplate(titulo), "utf-8");
  return getDocument(relativePath);
}

export async function updateDocument(
  relativePath: string,
  frontmatter: Frontmatter,
  content: string,
): Promise<AtlasDocument> {
  const absolutePath = resolveContentPath(relativePath);
  if (!(await pathExists(absolutePath))) {
    throw new Error(`El documento no existe: ${relativePath}`);
  }
  await fsp.writeFile(absolutePath, serializeFrontmatter(frontmatter, content), "utf-8");
  return getDocument(relativePath);
}

export async function deleteDocument(relativePath: string): Promise<void> {
  await fsp.unlink(resolveContentPath(relativePath));
}

export async function createFolder(relativePath: string): Promise<void> {
  const absolutePath = resolveContentPath(relativePath);
  if (await pathExists(absolutePath)) {
    throw new Error(`La carpeta ya existe: ${relativePath}`);
  }
  await fsp.mkdir(absolutePath, { recursive: true });
}

export async function deleteFolder(
  relativePath: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const absolutePath = resolveContentPath(relativePath);
  const entries = await fsp.readdir(absolutePath);
  if (entries.length > 0 && !options.force) {
    throw new Error(`La carpeta no está vacía: ${relativePath}`);
  }
  await fsp.rm(absolutePath, { recursive: true, force: true });
}

/** Mueve o renombra un documento o carpeta dentro de CONTENT_DIR. */
export async function movePath(
  fromRelativePath: string,
  toRelativePathArg: string,
): Promise<void> {
  const fromAbsolute = resolveContentPath(fromRelativePath);
  const toAbsolute = resolveContentPath(toRelativePathArg);

  if (await pathExists(toAbsolute)) {
    throw new Error(`Ya existe algo en el destino: ${toRelativePathArg}`);
  }

  await fsp.mkdir(path.dirname(toAbsolute), { recursive: true });
  await fsp.rename(fromAbsolute, toAbsolute);
}
