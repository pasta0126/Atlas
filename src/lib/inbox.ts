import fsp from "node:fs/promises";
import path from "node:path";
import { resolveContentPath, toRelativePath } from "./paths";
import { serializeFrontmatter } from "./frontmatter";
import { slugify } from "./slug";

export const INBOX_FOLDER = "inbox";
/** El contenedor corre en UTC; los nombres de las notas usan la hora local del usuario. */
const INBOX_TIME_ZONE = "Europe/Madrid";
const MAX_SLUG_LENGTH = 60;

function localTimestamp(now: Date): { fecha: string; hora: string; compacto: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: INBOX_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const fecha = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    fecha,
    hora: `${parts.hour}:${parts.minute}`,
    compacto: `${fecha}-${parts.hour}${parts.minute}${parts.second}`,
  };
}

/**
 * Crea una nota rápida en `inbox/` (p. ej. `inbox/2026-10-05-143210-titulo.md`)
 * para reorganizarla luego desde la web. Nunca sobrescribe: si el nombre ya
 * existe, añade un sufijo numérico. Devuelve la ruta relativa creada.
 */
export async function createInboxNote(
  contenido: string,
  titulo?: string,
  now = new Date(),
): Promise<string> {
  const { fecha, hora, compacto } = localTimestamp(now);
  const tituloFinal = titulo?.trim() || `Nota ${fecha} ${hora}`;
  const slug = titulo ? slugify(titulo).slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "") : "";
  const base = slug ? `${compacto}-${slug}` : compacto;

  const body = contenido.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const raw = serializeFrontmatter(
    { titulo: tituloFinal, fecha, etiquetas: ["inbox"] },
    body,
  );

  const folder = resolveContentPath(INBOX_FOLDER);
  await fsp.mkdir(folder, { recursive: true });

  for (let suffix = 0; ; suffix += 1) {
    const name = suffix === 0 ? `${base}.md` : `${base}-${suffix}.md`;
    const absolutePath = path.join(folder, name);
    try {
      await fsp.writeFile(absolutePath, raw, { encoding: "utf-8", flag: "wx" });
      return toRelativePath(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}
