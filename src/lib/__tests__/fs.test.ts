import { describe, expect, it, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import { PathTraversalError } from "../paths";
import {
  readTree,
  getDocument,
  createDocument,
  updateDocument,
  upsertDocument,
  deleteDocument,
  createFolder,
  deleteFolder,
  movePath,
  resolveRouteDocument,
} from "../fs";

describe("fs", () => {
  let contentDir: string;

  beforeEach(async () => {
    contentDir = await fsp.mkdtemp(path.join(os.tmpdir(), "atlas-fs-"));
    process.env.CONTENT_DIR = contentDir;
  });

  afterEach(async () => {
    await fsp.rm(contentDir, { recursive: true, force: true });
    delete process.env.CONTENT_DIR;
  });

  describe("documentos", () => {
    it("crea un documento nuevo a partir de la plantilla", async () => {
      const doc = await createDocument("personal/identidad.md", "Identidad");
      expect(doc.frontmatter.titulo).toBe("Identidad");
      expect(doc.content).toContain("# Identidad");

      const onDisk = await fsp.readFile(
        path.join(contentDir, "personal", "identidad.md"),
        "utf-8",
      );
      expect(onDisk).toContain("titulo: Identidad");
    });

    it("no permite crear un documento que ya existe", async () => {
      await createDocument("personal/identidad.md", "Identidad");
      await expect(createDocument("personal/identidad.md", "Otra vez")).rejects.toThrow(
        /ya existe/,
      );
    });

    it("edita el contenido y el frontmatter de un documento existente", async () => {
      await createDocument("personal/identidad.md", "Identidad");
      const updated = await updateDocument(
        "personal/identidad.md",
        { titulo: "Identidad", etiquetas: ["pensamientos"] },
        "# Identidad\n\nContenido editado.",
      );

      expect(updated.frontmatter.etiquetas).toEqual(["pensamientos"]);
      expect(updated.content).toContain("Contenido editado.");
    });

    it("no permite editar un documento inexistente", async () => {
      await expect(
        updateDocument("no-existe.md", { titulo: "X" }, "contenido"),
      ).rejects.toThrow(/no existe/);
    });

    it("elimina un documento", async () => {
      await createDocument("personal/identidad.md", "Identidad");
      await deleteDocument("personal/identidad.md");
      await expect(getDocument("personal/identidad.md")).rejects.toThrow();
    });
  });

  describe("upsertDocument", () => {
    it("crea el documento si no existe", async () => {
      const doc = await upsertDocument("personal/identidad.md", { titulo: "Identidad" }, "# Hola");
      expect(doc.content).toContain("# Hola");
    });

    it("sobrescribe el documento si ya existe", async () => {
      await upsertDocument("personal/identidad.md", { titulo: "Identidad" }, "# Hola");
      const updated = await upsertDocument(
        "personal/identidad.md",
        { titulo: "Identidad", etiquetas: ["x"] },
        "# Adiós",
      );
      expect(updated.content).toContain("# Adiós");
      expect(updated.frontmatter.etiquetas).toEqual(["x"]);
    });
  });

  describe("resolveRouteDocument", () => {
    it("resuelve el índice raíz cuando no hay segmentos", async () => {
      await createDocument("index.md", "Inicio");
      const doc = await resolveRouteDocument([]);
      expect(doc.path).toBe("index.md");
    });

    it("resuelve un documento cuando los segmentos incluyen el .md", async () => {
      await createDocument("personal/identidad.md", "Identidad");
      const doc = await resolveRouteDocument(["personal", "identidad.md"]);
      expect(doc.path).toBe(path.join("personal", "identidad.md"));
    });

    it("resuelve el index.md de una carpeta cuando los segmentos no tienen extensión", async () => {
      await createDocument("personal/index.md", "Personal");
      const doc = await resolveRouteDocument(["personal"]);
      expect(doc.path).toBe(path.join("personal", "index.md"));
    });

    it("si no hay index.md, prueba <segmentos>.md como documento", async () => {
      await createDocument("personal/identidad.md", "Identidad");
      const doc = await resolveRouteDocument(["personal", "identidad"]);
      expect(doc.path).toBe(path.join("personal", "identidad.md"));
    });
  });

  describe("carpetas", () => {
    it("crea una carpeta (tema o subcategoría)", async () => {
      await createFolder("tecnologia/aprendizajes");
      const stat = await fsp.stat(path.join(contentDir, "tecnologia", "aprendizajes"));
      expect(stat.isDirectory()).toBe(true);
    });

    it("no permite crear una carpeta que ya existe", async () => {
      await createFolder("tecnologia");
      await expect(createFolder("tecnologia")).rejects.toThrow(/ya existe/);
    });

    it("elimina una carpeta vacía", async () => {
      await createFolder("cultura");
      await deleteFolder("cultura");
      await expect(fsp.stat(path.join(contentDir, "cultura"))).rejects.toThrow();
    });

    it("no elimina una carpeta no vacía sin forzar", async () => {
      await createDocument("cultura/libros/un-libro.md", "Un libro");
      await expect(deleteFolder("cultura")).rejects.toThrow(/no está vacía/);
    });

    it("elimina una carpeta no vacía si se fuerza explícitamente", async () => {
      await createDocument("cultura/libros/un-libro.md", "Un libro");
      await deleteFolder("cultura", { force: true });
      await expect(fsp.stat(path.join(contentDir, "cultura"))).rejects.toThrow();
    });
  });

  describe("mover/renombrar", () => {
    it("mueve un documento a otra carpeta", async () => {
      await createDocument("personal/identidad.md", "Identidad");
      await movePath("personal/identidad.md", "personal/pensamientos/identidad.md");

      const moved = await getDocument("personal/pensamientos/identidad.md");
      expect(moved.frontmatter.titulo).toBe("Identidad");
      await expect(getDocument("personal/identidad.md")).rejects.toThrow();
    });

    it("no sobrescribe un destino ya existente", async () => {
      await createDocument("a.md", "A");
      await createDocument("b.md", "B");
      await expect(movePath("a.md", "b.md")).rejects.toThrow(/destino/);
    });
  });

  describe("seguridad", () => {
    it("propaga el error de path traversal al crear un documento", async () => {
      await expect(createDocument("../fuera.md", "Fuera")).rejects.toThrow(
        PathTraversalError,
      );
    });
  });

  describe("árbol de navegación", () => {
    it("refleja temas, subcategorías y documentos, usando index.md como título de sección", async () => {
      await createDocument("personal/index.md", "Personal");
      await createDocument("personal/pensamientos/identidad.md", "Identidad");
      await createDocument("tecnologia/ideas.md", "Ideas");

      const tree = await readTree();

      expect(tree.type).toBe("folder");
      const personal = tree.children?.find((n) => n.path === "personal");
      expect(personal?.title).toBe("Personal");
      // index.md no debe aparecer como hijo navegable de su propia carpeta
      expect(personal?.children?.some((n) => n.path.endsWith("index.md"))).toBe(false);

      const pensamientos = personal?.children?.find(
        (n) => n.path === "personal/pensamientos",
      );
      expect(pensamientos?.type).toBe("folder");
      expect(pensamientos?.children?.[0]?.title).toBe("Identidad");

      const tecnologia = tree.children?.find((n) => n.path === "tecnologia");
      expect(tecnologia?.children?.[0]?.title).toBe("Ideas");
    });

    it("humaniza el nombre de carpeta cuando no hay index.md", async () => {
      await createFolder("mis-proyectos-2026");
      const tree = await readTree();
      const folder = tree.children?.find((n) => n.path === "mis-proyectos-2026");
      expect(folder?.title).toBe("Mis Proyectos 2026");
    });
  });
});
