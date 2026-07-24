import { describe, expect, it, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import { simpleGit } from "simple-git";
import { commitChange, diff, history } from "../git";

describe("git", () => {
  let repoDir: string;
  let contentDir: string;

  beforeEach(async () => {
    // CONTENT_DIR es una subcarpeta del repo, no su raíz — refleja la
    // topología de producción (ver specs/02-design.md §1/§3).
    repoDir = await fsp.mkdtemp(path.join(os.tmpdir(), "atlas-git-repo-"));
    contentDir = path.join(repoDir, "atlas-content");
    await fsp.mkdir(contentDir, { recursive: true });

    const repo = simpleGit(repoDir);
    await repo.init();
    await repo.addConfig("user.name", "Test");
    await repo.addConfig("user.email", "test@example.com");

    process.env.CONTENT_DIR = contentDir;
    process.env.GIT_AUTHOR_NAME = "Atlas Bot";
    process.env.GIT_AUTHOR_EMAIL = "atlas-bot@example.com";
  });

  afterEach(async () => {
    await fsp.rm(repoDir, { recursive: true, force: true });
    delete process.env.CONTENT_DIR;
    delete process.env.GIT_AUTHOR_NAME;
    delete process.env.GIT_AUTHOR_EMAIL;
  });

  it("comitea un archivo nuevo bajo CONTENT_DIR", async () => {
    await fsp.writeFile(path.join(contentDir, "nota.md"), "# Nota\n");
    await commitChange("nota.md", "crear: nota.md");

    const commits = await history("nota.md");
    expect(commits).toHaveLength(1);
    expect(commits[0].message).toBe("crear: nota.md");
  });

  it("no genera un commit si no hay cambios que comitear", async () => {
    await fsp.writeFile(path.join(contentDir, "nota.md"), "# Nota\n");
    await commitChange("nota.md", "crear: nota.md");
    await commitChange("nota.md", "sin cambios");

    expect(await history("nota.md")).toHaveLength(1);
  });

  it("acumula varios commits en el historial, el más reciente primero", async () => {
    await fsp.writeFile(path.join(contentDir, "nota.md"), "# Nota\n");
    await commitChange("nota.md", "crear: nota.md");

    await fsp.writeFile(path.join(contentDir, "nota.md"), "# Nota\n\nEditada.\n");
    await commitChange("nota.md", "editar: nota.md");

    const commits = await history("nota.md");
    expect(commits.map((c) => c.message)).toEqual(["editar: nota.md", "crear: nota.md"]);
  });

  it("genera un diff entre dos commits de un archivo", async () => {
    await fsp.writeFile(path.join(contentDir, "nota.md"), "# Nota\n");
    await commitChange("nota.md", "crear: nota.md");

    await fsp.writeFile(path.join(contentDir, "nota.md"), "# Nota\n\nEditada.\n");
    await commitChange("nota.md", "editar: nota.md");

    const commits = await history("nota.md");
    const [ultimo] = commits;
    const patch = await diff("nota.md", `${ultimo.hash}^`, ultimo.hash);

    expect(patch).toContain("+Editada.");
  });

  it("comitea un mover/renombrar (git lo reporta como 'renamed', no 'staged')", async () => {
    await fsp.writeFile(path.join(contentDir, "nota.md"), "# Nota\n");
    await commitChange("nota.md", "crear: nota.md");

    await fsp.mkdir(path.join(contentDir, "sub"));
    await fsp.rename(path.join(contentDir, "nota.md"), path.join(contentDir, "sub", "nota.md"));
    await commitChange(["nota.md", "sub/nota.md"], "mover: nota.md -> sub/nota.md");

    const commits = await history("sub/nota.md");
    expect(commits.map((c) => c.message)).toEqual(["mover: nota.md -> sub/nota.md", "crear: nota.md"]);
  });

  it("no lanza si CONTENT_DIR no está dentro de un repo git", async () => {
    const otherDir = await fsp.mkdtemp(path.join(os.tmpdir(), "atlas-no-repo-"));
    process.env.CONTENT_DIR = otherDir;
    await fsp.writeFile(path.join(otherDir, "nota.md"), "# Nota\n");

    await expect(commitChange("nota.md", "crear: nota.md")).resolves.toBeUndefined();
    await fsp.rm(otherDir, { recursive: true, force: true });
  });
});
