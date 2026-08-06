# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Atlas is a self-hosted, single-user web app for managing a personal "atlas" of
Markdown notes (theme → subcategory → document). Content lives as plain `.md`
files in a folder versioned with its own independent git repo (`CONTENT_DIR`,
in practice `vedlvm`), completely separate from this app's repo. Atlas is only
the engine (read, edit, search, navigate, history) — never the owner of the
data. Not built for multi-user collaboration or public publishing.

## This is NOT the Next.js you know

This repo runs Next.js 16, which has breaking changes vs. older versions —
APIs, conventions, and file structure may differ from training data. Before
writing Next.js-specific code, check `node_modules/next/dist/docs/` for the
relevant guide. Notably: **middleware is `src/proxy.ts`** (exporting `proxy()`),
not `middleware.ts`.

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build         # production build
npm start              # serve production build
npm run lint            # ESLint
npm run format           # Prettier --write
npm run format:check      # Prettier --check
npm test                   # Vitest (single run)
npm run test:watch          # Vitest watch mode
```

Run a single test file: `npx vitest run src/lib/__tests__/paths.test.ts`

Tests live alongside the lib they cover, under `src/lib/__tests__/`, and use
`environment: "node"` (see `vitest.config.ts`). The `@/*` path alias maps to
`src/*` in both TypeScript and Vitest.

## Environment

Copy `.env.example` to `.env.local`. Required vars: `CONTENT_DIR` (absolute
path to the content folder, independent repo), `AUTH_USER`,
`AUTH_PASSWORD_HASH` (bcrypt, generate with `npx bcrypt-cli`),
`SESSION_SECRET`, `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`.

**If the bcrypt hash contains `$`, escape it as `\$` in `.env.local`**,
otherwise Next.js interprets it as a variable reference.

In development, point `CONTENT_DIR` at `atlas-content-dev/` (gitignored
sample content with its own repo) to avoid touching real data.

## Architecture

No database — all state is derived from the filesystem and git, rebuilt in
memory on process start.

```
UI (React, src/components)  ⇄  API Routes (src/app/api/*)
                                       │
                          Data access layer (src/lib)
                        fs.ts + frontmatter.ts + git.ts
                                       │
                    CONTENT_DIR (independent git repo, e.g. vedlvm)
```

Key modules in `src/lib/`:

- **`paths.ts`** — resolves relative paths against `CONTENT_DIR` and guards
  against path traversal (`resolveContentPath`). Every fs operation on
  user-supplied paths must go through this.
- **`fs.ts`** — safe read/write within `CONTENT_DIR`.
- **`frontmatter.ts`** — parses frontmatter via `gray-matter` (fields:
  `titulo`, `fecha`, `etiquetas`, `relacionados`).
- **`git.ts`** — wraps `simple-git` over `CONTENT_DIR`. Every write from the
  API ends in `git add` + `git commit -m "<verbo>: <ruta>"` with a fixed
  author from `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`. No commit is made if
  there's nothing to commit (e.g. creating an empty folder).
- **`links.ts`** — resolves wikilinks (`[[doc]]` / `[[doc|texto]]`) and
  computes backlinks. **Does exact string matching against on-disk paths** —
  no slugify/case/accent normalization. Renaming content outside the app (or
  even inside it) can leave wikilinks pointing at stale paths.
- **`search-index.ts`** — in-memory MiniSearch index over all content, no
  persistent cache. `invalidateSearchIndex()` is only called from
  `/api/docs*` and `/api/folders/[...path]` — changes made to `CONTENT_DIR`
  from outside the app's API (e.g. a manual `git mv` on the host) leave the
  search index stale until the process restarts.
- **`auth.ts`** — single-user session (signed cookie), verified in
  `src/proxy.ts` for every route except `/login` and `/api/auth/login`.
- **`slug.ts`** — slugify used as the naming convention for content in
  `CONTENT_DIR` (lowercase ascii, `-` for spaces, no accents), applied by
  convention/by hand to content, not enforced by the app.
- **`crypto.ts`** — client-side-only per-document encryption (AES-256-GCM,
  key derived via PBKDF2-SHA256/600k iterations, random salt+IV per
  encryption). Encrypts/decrypts a document's body; the server never sees
  the passphrase or plaintext, only the opaque JSON envelope
  (`{v, salt, iv, ciphertext}`) that sits in place of `AtlasDocument.content`
  when `frontmatter.cifrado` is `true`. Only the body is encrypted —
  frontmatter (title/tags) stays plaintext so nav/tags keep working. See
  `specs/02-design.md` §6.1 for the full design and accepted limitations
  (no full-text search or wikilink extraction inside an encrypted body, no
  passphrase recovery). Lock/unlock state and the encrypt-on-save flow live
  in `components/editor/document-editor.tsx`.

## Data model (no DB, derived from disk)

```ts
interface AtlasNode {
  path: string; // relative to CONTENT_DIR
  type: "folder" | "document";
  title: string; // frontmatter.titulo or humanized folder name
  children?: AtlasNode[];
}

interface AtlasDocument {
  path: string;
  frontmatter: { titulo?: string; fecha?: string; etiquetas?: string[]; relacionados?: string[]; cifrado?: boolean };
  content: string; // markdown, frontmatter stripped — or an encrypted envelope JSON string if frontmatter.cifrado is true
  backlinks: string[];
}
```

## Security invariants

- All write routes validate that the resolved path stays inside
  `CONTENT_DIR` (`resolveContentPath` in `paths.ts` — throws
  `PathTraversalError` otherwise).
- Passwords are never stored in plaintext — only a bcrypt hash in an env var.
- Session cookie is `httpOnly`, `secure`, `sameSite=strict`, signed with
  `SESSION_SECRET`.
- Every route except `/login` and `/api/auth/login` requires a valid session
  (enforced in `src/proxy.ts`).
- For encrypted documents, the API routes are intentionally passphrase-blind:
  `content` is treated as an opaque string end-to-end. Never add server-side
  decryption or a passphrase-recovery path — that would break the
  confidentiality guarantee the feature exists for.

## Deployment

`Dockerfile` (multi-stage, `node:20-alpine`, `git` installed since `git.ts`
shells out to the real binary) + `docker-compose.yml`, self-hosted behind
Traefik. `scripts/deploy.sh` does `git pull`, rebuilds the image, and brings
up the container via `docker compose`. `CONTENT_DIR` is mounted as a volume
(`vedlvm` has its own independent `.git`, separate from the app's repo).
