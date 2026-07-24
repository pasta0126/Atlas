# Plan de tareas — Atlas

Cada tarea referencia el/los requisito(s) de `01-requirements.md` que satisface.
Orden pensado para tener, cuanto antes, una vertical funcional (leer y editar un
documento) antes de añadir funciones transversales (búsqueda, git, backlinks).

## Fase 0 — Setup del proyecto

- [x] 0.1 Inicializar proyecto Next.js (TypeScript, App Router, Tailwind).
- [x] 0.2 Configurar `.env.example` con `CONTENT_DIR`, `AUTH_USER`,
      `AUTH_PASSWORD_HASH`, `SESSION_SECRET`.
- [x] 0.3 Crear carpeta de contenido de desarrollo (`atlas-content-dev/`, gitignored)
      con 2-3 temas de ejemplo, para no depender del atlas real durante el desarrollo.
- [x] 0.4 Configurar lint/format (ESLint + Prettier) y scripts de `package.json`.

## Fase 1 — Acceso a datos (capa `lib/`)

_Cubre: 3.2, 3.3, 3.7_

- [x] 1.1 `lib/fs.ts`: leer árbol de `CONTENT_DIR`, resolver rutas de forma segura
      (bloquear path traversal fuera de `CONTENT_DIR`).
- [x] 1.2 `lib/frontmatter.ts`: parsear/serializar frontmatter con `gray-matter`.
- [x] 1.3 Funciones de creación/edición/borrado/movimiento de documentos y carpetas
      sobre el filesystem.
- [x] 1.4 Tests unitarios de la capa de acceso a datos (casos: crear, mover, borrar,
      intento de path traversal, carpeta no vacía).

## Fase 2 — Autenticación

_Cubre: 3.1_

- [x] 2.1 `lib/auth.ts`: verificación de credenciales contra env vars (hash bcrypt).
- [x] 2.2 Endpoint `POST /api/auth/login` y `POST /api/auth/logout`.
- [x] 2.3 Proxy de Next.js (`src/proxy.ts`, antes "middleware") que protege todas
      las rutas salvo `/login` y `/api/auth/login`.
- [x] 2.4 Página de login (UI mínima).

## Fase 3 — Vertical funcional mínima (leer y editar un documento)

_Cubre: 3.2, 3.3 (parcial), criterio de aceptación 2-4_

- [x] 3.1 Endpoint `GET /api/tree`.
- [x] 3.2 Endpoint `GET /api/docs/[...path]` y `PUT /api/docs/[...path]`
      (`upsertDocument` en `lib/fs.ts`, crea o sobrescribe).
- [x] 3.3 Componente árbol de navegación (`components/nav-tree`).
- [x] 3.4 Componente editor (CodeMirror 6 vía `@uiw/react-codemirror`) + preview
      (`react-markdown` + `remark-gfm`).
- [x] 3.5 Página de documento: layout árbol + editor + preview, guardar con
      `Ctrl+S` (`app/(atlas)/[[...path]]/page.tsx` + `app/(atlas)/layout.tsx`).
- [x] 3.6 Manejo de `index.md` como página de entrada de carpeta
      (`lib/fs.ts#resolveRouteDocument`).

**Checkpoint**: en este punto ya se puede navegar, abrir y editar documentos desde
la web. Es el primer hito demostrable.

## Fase 4 — Gestión de estructura (crear/mover/borrar)

_Cubre: 3.2, 3.3, criterio de aceptación 3, 8_

- [x] 4.1 UI para crear documento nuevo (a partir de plantilla) dentro de una carpeta
      (`POST /api/docs`, `lib/slug.ts`, menú "⋯" en `components/nav-tree`).
- [x] 4.2 UI para crear carpeta (tema/subcategoría) (`POST /api/folders`).
- [x] 4.3 Renombrar/mover documento y carpeta (`POST /api/docs/move` + UI vía
      `window.prompt` con la ruta destino editable; sin drag&drop, queda para
      Fase 9 si se echa en falta).
- [x] 4.4 Eliminar documento/carpeta con confirmación (`window.confirm`;
      `DELETE /api/docs/[...path]`, `DELETE /api/folders/[...path]` bloquea
      carpetas no vacías salvo `?force=true`, con segunda confirmación en la UI).

## Fase 5 — Git como motor de versionado

_Cubre: 3.6, criterio de aceptación 1 y 7_

- [x] 5.1 `lib/git.ts` con `simple-git`: commit automático tras cada escritura
      (crear/editar/borrar documento, mover, borrar carpeta), acotado a
      `CONTENT_DIR` dentro del repo de la app (no asume que sea su propio
      repo raíz). No lanza si git falla; el commit es un efecto secundario,
      nunca bloquea el guardado.
- [x] 5.2 Endpoint `GET /api/git/history/[...path]`.
- [x] 5.3 Endpoint `GET /api/git/diff/[...path]?from=&to=`.
- [x] 5.4 UI: panel de historial de un documento + vista de diff
      (`components/history`, pestaña "Historial" junto a "Preview" en el
      editor).

## Fase 6 — Enlaces internos y backlinks

_Cubre: 3.3 (wikilinks), 3.4, criterio de aceptación 5_

- [x] 6.1 `lib/links.ts`: parseo de wikilinks `[[doc]]`/`[[doc|alias]]` y enlaces
      relativos `.md` en el contenido markdown.
- [x] 6.2 Resolución de wikilinks/enlaces relativos a rutas reales al renderizar
      preview (`components/preview/preview.tsx`, `<a>` custom + `urlTransform` de
      `react-markdown`), con estado visual de "enlace roto" (span rojo con tooltip)
      si no existe el destino.
- [x] 6.3 Cálculo de backlinks (`lib/fs.ts#getDocument` vía `lib/links.ts`,
      escaneo de todo el atlas) y pestaña "Backlinks" junto a Preview/Historial
      en el editor (`components/backlinks`).

## Fase 7 — Búsqueda

_Cubre: 3.5, criterio de aceptación 6_

- [ ] 7.1 `lib/search-index.ts`: construir índice en memoria (MiniSearch/FlexSearch)
      al arrancar, actualizar incrementalmente en cada escritura.
- [ ] 7.2 Endpoint `GET /api/search`.
- [ ] 7.3 UI de búsqueda (command palette tipo `Ctrl+K`) con resultados por
      título/ruta/contenido/etiqueta.

## Fase 8 — Metadatos y etiquetas

_Cubre: 3.7_

- [ ] 8.1 UI de edición de frontmatter (título, fecha, etiquetas, relacionados) en
      el panel del editor.
- [ ] 8.2 Vista de listado de documentos filtrado por etiqueta.

## Fase 9 — Pulido UI/UX

_Cubre: requisitos no funcionales de diseño_

- [ ] 9.1 Tema claro/oscuro.
- [ ] 9.2 Tipografía y layout definitivos (revisar principio "no corporativo").
- [ ] 9.3 Responsive básico (navegación colapsable en móvil).

## Fase 10 — Despliegue (RPi + Traefik existente)

_Cubre: requisito de despliegue autoalojado — ver `02-design.md` §9 para el detalle
de la infraestructura ya en marcha (Traefik, red `proxy`, DNS cdmon)_

- [x] 10.1 `Dockerfile` multi-stage sobre `node:20-alpine` (arm64), con `git`
      instalado en el stage final. `next.config.ts` con `output: "standalone"`.
- [x] 10.2 `docker-compose.yml` sin puertos publicados, unido a la red externa
      `proxy`, con labels Traefik (`Host(atlas.northernarchive.com)`,
      `certresolver=le`, `entrypoints=websecure`), `user: "1001:1001"`, y
      volumen de **todo el repo** `~/atlas:/workspace:rw` (no solo
      `atlas-content/` — ver `02-design.md` §9, necesario para que
      `simple-git` vea el `.git` del repo).
- [x] 10.3 `atlas-content/` poblada con contenido mínimo (`index.md`) y
      comiteada en el repo de la app (decisión del usuario 2026-07-24: no
      había contenido real que migrar todavía; se irá añadiendo desde la
      propia web una vez desplegada).
- [x] 10.4 Alta manual del registro DNS `atlas.northernarchive.com` → `79.116.22.49`
      en el panel de cdmon (paso fuera de código, análogo al hecho para `sauron`).
      Ya hecho por el usuario (2026-07-24).
- [ ] 10.5 Levantar el stack (`docker compose up -d`) y verificar: certificado TLS
      emitido por Let's Encrypt, login funcionando, lectura/escritura sobre
      `atlas-content` con permisos correctos (uid 1001), commits automáticos
      apareciendo en `git log` del repo.
- [ ] 10.6 Documentar el flujo de actualización en producción (`git pull --rebase`
      antes de reconstruir, para reaplicar los commits automáticos de
      contenido sin conflicto — ver `02-design.md` §9) y, si se quiere doble
      respaldo, un `git push` periódico desde la RPi al remoto
      `pasta0126/Atlas` (cron o manual).
- [ ] 10.7 Actualizar `~/infra/ROADMAP.md` (o crear nota equivalente) registrando
      la nueva app y el subdominio dado de alta, siguiendo la convención ya usada
      ahí para `sauron`.

---

**Siguiente paso sugerido**: confirmar esta spec y empezar por la Fase 0 + Fase 1,
que no dependen de decisiones de UI y sientan la base de todo lo demás.
