const COMBINING_DIACRITICS = new RegExp(`[\\u0300-\\u036f]`, "g");

/** Convierte un título en un nombre de archivo/carpeta seguro (slug). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
