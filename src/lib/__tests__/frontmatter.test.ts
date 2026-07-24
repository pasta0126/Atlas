import { describe, expect, it } from "vitest";
import { parseFrontmatter, serializeFrontmatter, documentTemplate } from "../frontmatter";

describe("frontmatter", () => {
  it("parsea el frontmatter y el contenido de un documento", () => {
    const raw = `---\ntitulo: Identidad\netiquetas:\n  - pensamientos\n---\n\n# Identidad\n\nTexto.\n`;
    const { frontmatter, content } = parseFrontmatter(raw);

    expect(frontmatter.titulo).toBe("Identidad");
    expect(frontmatter.etiquetas).toEqual(["pensamientos"]);
    expect(content).toBe("# Identidad\n\nTexto.\n");
  });

  it("parsea un documento sin frontmatter", () => {
    const { frontmatter, content } = parseFrontmatter("# Solo contenido\n");
    expect(frontmatter).toEqual({});
    expect(content).toBe("# Solo contenido\n");
  });

  it("serializa y vuelve a parsear sin perder datos (round-trip)", () => {
    const serialized = serializeFrontmatter(
      { titulo: "Cambios", etiquetas: ["pensamientos", "identidad"] },
      "# Cambios\n\nContenido de prueba.",
    );
    const { frontmatter, content } = parseFrontmatter(serialized);

    expect(frontmatter.titulo).toBe("Cambios");
    expect(frontmatter.etiquetas).toEqual(["pensamientos", "identidad"]);
    expect(content).toBe("# Cambios\n\nContenido de prueba.\n");
  });

  it("genera una plantilla de documento nuevo con título y fecha", () => {
    const raw = documentTemplate("Nueva idea");
    const { frontmatter, content } = parseFrontmatter(raw);

    expect(frontmatter.titulo).toBe("Nueva idea");
    expect(typeof frontmatter.fecha).toBe("string");
    expect(content).toContain("# Nueva idea");
  });
});
