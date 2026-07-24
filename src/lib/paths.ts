import path from "node:path";

export class PathTraversalError extends Error {
  constructor(relativePath: string) {
    super(`Ruta fuera de CONTENT_DIR: ${relativePath}`);
    this.name = "PathTraversalError";
  }
}

export function getContentDir(): string {
  const dir = process.env.CONTENT_DIR;
  if (!dir) {
    throw new Error("CONTENT_DIR no está configurado");
  }
  return path.resolve(dir);
}

/**
 * Resuelve una ruta relativa contra CONTENT_DIR y garantiza que el resultado
 * no se escape de esa carpeta (protección contra path traversal, p. ej. "../../etc").
 */
export function resolveContentPath(relativePath: string): string {
  const contentDir = getContentDir();
  const resolved = path.resolve(contentDir, relativePath);
  const contentDirWithSep = contentDir.endsWith(path.sep)
    ? contentDir
    : contentDir + path.sep;

  if (resolved !== contentDir && !resolved.startsWith(contentDirWithSep)) {
    throw new PathTraversalError(relativePath);
  }

  return resolved;
}

export function toRelativePath(absolutePath: string): string {
  return path.relative(getContentDir(), absolutePath);
}
