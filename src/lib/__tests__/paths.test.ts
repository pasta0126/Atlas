import { describe, expect, it, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import { resolveContentPath, toRelativePath, PathTraversalError } from "../paths";

describe("paths", () => {
  let contentDir: string;

  beforeEach(async () => {
    contentDir = await fsp.mkdtemp(path.join(os.tmpdir(), "atlas-paths-"));
    process.env.CONTENT_DIR = contentDir;
  });

  afterEach(async () => {
    await fsp.rm(contentDir, { recursive: true, force: true });
    delete process.env.CONTENT_DIR;
  });

  it("resuelve una ruta relativa dentro de CONTENT_DIR", () => {
    const resolved = resolveContentPath("personal/identidad.md");
    expect(resolved).toBe(path.join(contentDir, "personal", "identidad.md"));
  });

  it("resuelve la raíz de CONTENT_DIR", () => {
    expect(resolveContentPath(".")).toBe(contentDir);
  });

  it("bloquea el path traversal con ../..", () => {
    expect(() => resolveContentPath("../../etc/passwd")).toThrow(PathTraversalError);
  });

  it("bloquea el path traversal aunque empiece dentro", () => {
    expect(() => resolveContentPath("personal/../../fuera.md")).toThrow(
      PathTraversalError,
    );
  });

  it("convierte una ruta absoluta de vuelta a relativa", () => {
    const absolute = path.join(contentDir, "tecnologia", "ideas.md");
    expect(toRelativePath(absolute)).toBe(path.join("tecnologia", "ideas.md"));
  });
});
