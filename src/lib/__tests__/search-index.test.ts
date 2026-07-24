import { describe, expect, it, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import { createDocument } from "../fs";
import { invalidateSearchIndex, searchDocuments } from "../search-index";

describe("search-index", () => {
  let contentDir: string;

  beforeEach(async () => {
    contentDir = await fsp.mkdtemp(path.join(os.tmpdir(), "atlas-search-"));
    process.env.CONTENT_DIR = contentDir;
    invalidateSearchIndex();
  });

  afterEach(async () => {
    invalidateSearchIndex();
    await fsp.rm(contentDir, { recursive: true, force: true });
    delete process.env.CONTENT_DIR;
  });

  it("devuelve una lista vacía para una consulta vacía", async () => {
    expect(await searchDocuments("")).toEqual([]);
    expect(await searchDocuments("   ")).toEqual([]);
  });

  it("encuentra un documento por título", async () => {
    await createDocument("personal/identidad.md", "Identidad");
    const results = await searchDocuments("Identidad");
    expect(results.some((r) => r.path === "personal/identidad.md")).toBe(true);
  });

  it("encuentra un documento por ruta", async () => {
    await createDocument("tecnologia/aprendizajes/llms.md", "Sobre LLMs");
    const results = await searchDocuments("aprendizajes");
    expect(results.some((r) => r.path === "tecnologia/aprendizajes/llms.md")).toBe(true);
  });

  it("encuentra un documento por contenido", async () => {
    const { upsertDocument } = await import("../fs");
    await upsertDocument(
      "cultura/libro.md",
      { titulo: "Un libro" },
      "Un párrafo que menciona la palabra realismo mágico.",
    );
    const results = await searchDocuments("realismo mágico");
    expect(results.some((r) => r.path === "cultura/libro.md")).toBe(true);
  });

  it("no devuelve resultados para un documento eliminado tras invalidar el índice", async () => {
    await createDocument("temporal.md", "Temporal");
    expect((await searchDocuments("Temporal")).length).toBeGreaterThan(0);

    const { deleteDocument } = await import("../fs");
    await deleteDocument("temporal.md");
    invalidateSearchIndex();

    expect(await searchDocuments("Temporal")).toEqual([]);
  });
});
