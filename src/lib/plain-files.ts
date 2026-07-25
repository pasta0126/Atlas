import fsp from "node:fs/promises";
import { resolveContentPath } from "./paths";

/** Lee un fichero de texto plano tal cual, sin interpretar frontmatter. */
export async function readTextFile(relativePath: string): Promise<string> {
  return fsp.readFile(resolveContentPath(relativePath), "utf-8");
}

/** Sobrescribe un fichero de texto plano tal cual, sin frontmatter. */
export async function writeTextFile(relativePath: string, content: string): Promise<void> {
  await fsp.writeFile(resolveContentPath(relativePath), content, "utf-8");
}

/** Lee un fichero binario (p. ej. imágenes) para servirlo tal cual. */
export async function readBinaryFile(relativePath: string): Promise<Buffer> {
  return fsp.readFile(resolveContentPath(relativePath));
}
