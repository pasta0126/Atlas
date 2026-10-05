import { describe, expect, it, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import { createInboxNote } from "../inbox";
import { parseFrontmatter } from "../frontmatter";

describe("inbox", () => {
  let contentDir: string;
  // 2026-10-05 12:32:10 UTC = 14:32:10 en Madrid (horario de verano)
  const now = new Date("2026-10-05T12:32:10Z");

  beforeEach(async () => {
    contentDir = await fsp.mkdtemp(path.join(os.tmpdir(), "atlas-inbox-"));
    process.env.CONTENT_DIR = contentDir;
  });

  afterEach(async () => {
    await fsp.rm(contentDir, { recursive: true, force: true });
    delete process.env.CONTENT_DIR;
  });

  async function read(relativePath: string) {
    return parseFrontmatter(
      await fsp.readFile(path.join(contentDir, relativePath), "utf-8"),
    );
  }

  it("crea la nota en inbox/ con la hora local de Madrid", async () => {
    const created = await createInboxNote("hola\r\nmundo", undefined, now);
    expect(created).toBe("inbox/2026-10-05-143210.md");

    const { frontmatter, content } = await read(created);
    expect(frontmatter).toEqual({
      titulo: "Nota 2026-10-05 14:32",
      fecha: "2026-10-05",
      etiquetas: ["inbox"],
    });
    expect(content).toBe("hola\nmundo\n");
  });

  it("usa el título para el nombre y el frontmatter", async () => {
    const created = await createInboxNote("texto", "Reunión con Ángel", now);
    expect(created).toBe("inbox/2026-10-05-143210-reunion-con-angel.md");
    expect((await read(created)).frontmatter.titulo).toBe("Reunión con Ángel");
  });

  it("no sobrescribe si el nombre ya existe", async () => {
    const first = await createInboxNote("uno", undefined, now);
    const second = await createInboxNote("dos", undefined, now);
    expect(second).toBe("inbox/2026-10-05-143210-1.md");
    expect((await read(first)).content).toBe("uno\n");
  });

  it("quita el BOM UTF-8 que añaden algunos editores de Windows", async () => {
    const created = await createInboxNote("\uFEFFsin bom", undefined, now);
    expect((await read(created)).content).toBe("sin bom\n");
  });
});
