import { describe, expect, it } from "vitest";
import {
  backlinksFor,
  computeBacklinks,
  extractWikilinks,
  resolveMarkdownHref,
  wikilinksToMarkdown,
} from "../links";

describe("links", () => {
  describe("extractWikilinks", () => {
    it("extrae wikilinks simples y con alias", () => {
      const content = "Ver [[personal/identidad]] y también [[cultura/libro|un libro]].";
      expect(extractWikilinks(content)).toEqual([
        { target: "personal/identidad", alias: undefined },
        { target: "cultura/libro", alias: "un libro" },
      ]);
    });

    it("devuelve una lista vacía si no hay wikilinks", () => {
      expect(extractWikilinks("Texto sin enlaces.")).toEqual([]);
    });
  });

  describe("wikilinksToMarkdown", () => {
    it("convierte wikilinks a enlaces markdown con esquema wikilink:", () => {
      expect(wikilinksToMarkdown("Ver [[personal/identidad]].")).toBe(
        "Ver [personal/identidad](wikilink:personal%2Fidentidad).",
      );
    });

    it("usa el alias como texto del enlace cuando existe", () => {
      expect(wikilinksToMarkdown("[[cultura/libro|Un libro]]")).toBe(
        "[Un libro](wikilink:cultura%2Flibro)",
      );
    });
  });

  describe("resolveMarkdownHref", () => {
    const docPaths = new Set(["personal/identidad.md", "personal/recuerdos/primero.md"]);

    it("resuelve un wikilink existente", () => {
      expect(
        resolveMarkdownHref("wikilink:personal%2Fidentidad", "cultura/index.md", docPaths),
      ).toBe("personal/identidad.md");
    });

    it("marca como roto un wikilink a un documento inexistente", () => {
      expect(resolveMarkdownHref("wikilink:no-existe", "cultura/index.md", docPaths)).toBeNull();
    });

    it("resuelve un enlace relativo .md respecto al documento de origen", () => {
      expect(
        resolveMarkdownHref("../identidad.md", "personal/recuerdos/primero.md", docPaths),
      ).toBe("personal/identidad.md");
    });

    it("ignora enlaces externos y anclas", () => {
      expect(resolveMarkdownHref("https://example.com", "a.md", docPaths)).toBeUndefined();
      expect(resolveMarkdownHref("#seccion", "a.md", docPaths)).toBeUndefined();
    });

    it("ignora enlaces internos que no apuntan a un .md", () => {
      expect(resolveMarkdownHref("/personal/identidad", "a.md", docPaths)).toBeUndefined();
    });
  });

  describe("computeBacklinks / backlinksFor", () => {
    const docs = [
      { path: "personal/identidad.md", content: "Enlaza a [[personal/recuerdos/primero]]." },
      { path: "personal/recuerdos/primero.md", content: "Enlazado desde identidad." },
      { path: "cultura/libro.md", content: "También apunta a [[personal/recuerdos/primero]]." },
      { path: "roto.md", content: "Apunta a [[no-existe]]." },
    ];

    it("calcula backlinks para todos los documentos existentes", () => {
      const backlinks = computeBacklinks(docs);
      expect(backlinks.get("personal/recuerdos/primero.md")).toEqual([
        "cultura/libro.md",
        "personal/identidad.md",
      ]);
      expect(backlinks.has("no-existe.md")).toBe(false);
    });

    it("backlinksFor devuelve una lista vacía si nadie enlaza al documento", () => {
      expect(backlinksFor("cultura/libro.md", docs)).toEqual([]);
    });

    it("un documento no se cuenta a sí mismo como backlink", () => {
      const selfLinking = [{ path: "a.md", content: "[[a]]" }];
      expect(backlinksFor("a.md", selfLinking)).toEqual([]);
    });
  });
});
