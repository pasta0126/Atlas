import { describe, expect, it, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import { createDocument, updateDocument } from "../fs";
import { listDocumentsByTag, listTags } from "../tags";

describe("tags", () => {
  let contentDir: string;

  beforeEach(async () => {
    contentDir = await fsp.mkdtemp(path.join(os.tmpdir(), "atlas-tags-"));
    process.env.CONTENT_DIR = contentDir;
  });

  afterEach(async () => {
    await fsp.rm(contentDir, { recursive: true, force: true });
    delete process.env.CONTENT_DIR;
  });

  it("no devuelve etiquetas si ningún documento tiene", async () => {
    await createDocument("a.md", "A");
    expect(await listTags()).toEqual([]);
  });

  it("cuenta cuántos documentos usan cada etiqueta", async () => {
    await createDocument("a.md", "A");
    await updateDocument("a.md", { titulo: "A", etiquetas: ["libros", "recuerdos"] }, "# A");
    await createDocument("b.md", "B");
    await updateDocument("b.md", { titulo: "B", etiquetas: ["libros"] }, "# B");

    const tags = await listTags();
    expect(tags).toEqual([
      { tag: "libros", count: 2 },
      { tag: "recuerdos", count: 1 },
    ]);
  });

  it("lista los documentos que tienen una etiqueta, ordenados por título", async () => {
    await createDocument("z.md", "Zeta");
    await updateDocument("z.md", { titulo: "Zeta", etiquetas: ["libros"] }, "# Zeta");
    await createDocument("a.md", "Alfa");
    await updateDocument("a.md", { titulo: "Alfa", etiquetas: ["libros"] }, "# Alfa");
    await createDocument("sin-etiqueta.md", "Sin etiqueta");

    const docs = await listDocumentsByTag("libros");
    expect(docs.map((d) => d.title)).toEqual(["Alfa", "Zeta"]);
  });

  it("devuelve una lista vacía para una etiqueta sin documentos", async () => {
    await createDocument("a.md", "A");
    expect(await listDocumentsByTag("inexistente")).toEqual([]);
  });
});
