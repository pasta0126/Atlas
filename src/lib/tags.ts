import { readAllDocumentsParsed } from "./fs";

export interface TagCount {
  tag: string;
  count: number;
}

export interface TaggedDocument {
  path: string;
  title: string;
}

/** Todas las etiquetas usadas en el atlas, con el número de documentos que las tienen. */
export async function listTags(): Promise<TagCount[]> {
  const docs = await readAllDocumentsParsed();
  const counts = new Map<string, number>();

  for (const doc of docs) {
    for (const tag of doc.frontmatter.etiquetas ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) =>
    a.tag.localeCompare(b.tag),
  );
}

/** Documentos que tienen una etiqueta concreta, ordenados por título. */
export async function listDocumentsByTag(tag: string): Promise<TaggedDocument[]> {
  const docs = await readAllDocumentsParsed();

  return docs
    .filter((doc) => (doc.frontmatter.etiquetas ?? []).includes(tag))
    .map((doc) => ({ path: doc.path, title: doc.frontmatter.titulo ?? doc.path }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
