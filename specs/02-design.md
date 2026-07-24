# Diseño — Atlas (motor web de gestión del atlas personal)

## 1. Decisiones de arquitectura (y por qué)

| Decisión                  | Elección                                                                                                                     | Motivo                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Despliegue                | Autoalojado, expuesto a internet                                                                                             | Definido por el usuario. Requiere auth propia.                                                                                                                |
| Servidor                  | RPi 4 (aarch64, DietPi) en `192.168.1.10`, ya en producción con Traefik                                                      | Es el mismo host que sirve `northernarchive.com` y `sauron.northernarchive.com`. La app debe encajar en esa infraestructura existente, no crear una paralela. |
| Reverse proxy / TLS       | Traefik v3.7 ya desplegado (`~/infra/traefik`), red docker externa `proxy`, resolver ACME `le` (HTTP-01)                     | Reutilizar lo que ya funciona; no montar Nginx/Caddy propios ni gestionar certificados en la app.                                                             |
| Persistencia de contenido | Carpeta de archivos `.md` versionada con git                                                                                 | Legibilidad, portabilidad, historial gratis vía git, cero acoplamiento a una BD.                                                                              |
| Relación app/contenido    | Repos git separados (el contenido tiene su propio historial, independiente del código), pero `CONTENT_DIR` vive como subcarpeta *dentro* de la carpeta del repo de la app en el host (`~/atlas/atlas-content`), no como hermana fuera de ella | El contenido no se mezcla con el código de la app (commits, historial y `.gitignore` separados), pero mantenerlo bajo `~/atlas/` deja todo lo persistente (código versionado + contenido versionado) en un único directorio del host, coherente con cómo ya se organiza en desarrollo (`atlas-content-dev/` dentro del propio repo). |
| Stack                     | Next.js 14+ (App Router) + TypeScript                                                                                        | Full-stack en un solo proyecto (UI + API routes), buen soporte de despliegue autoalojado (Node server / Docker), ecosistema maduro para un mantenedor único.  |
| Base de datos             | Ninguna en v1                                                                                                                | Todo el estado vive en el sistema de archivos + git. Menos infraestructura que mantener en un servidor doméstico.                                             |
| Autenticación             | Sesión propia con cookie firmada (usuario/contraseña únicos por env vars)                                                    | Un solo usuario; no se justifica OAuth/next-auth completo.                                                                                                    |
| Operaciones git           | `simple-git` (wrapper de la CLI de git) desde el backend                                                                     | Evita reimplementar git; usa el binario real instalado en el servidor.                                                                                        |
| Editor Markdown           | CodeMirror 6 + `react-markdown`/`remark` para preview                                                                        | Editor ligero, extensible, sin dependencias pesadas tipo Slate/ProseMirror que no aportan aquí.                                                               |
| Búsqueda                  | Índice en memoria construido al vuelo (FlexSearch o MiniSearch) sobre los archivos, sin BD externa                           | Volumen personal (miles de docs) cabe en memoria; evita levantar Elasticsearch/Postgres.                                                                      |

## 2. Arquitectura general

```
┌─────────────────────────────────────────────┐
│                Next.js App                   │
│                                               │
│  ┌───────────────┐      ┌──────────────────┐ │
│  │  UI (React)    │◄────►│  API Routes      │ │
│  │  - Árbol nav   │      │  - /api/tree     │ │
│  │  - Editor      │      │  - /api/docs/*   │ │
│  │  - Preview     │      │  - /api/search   │ │
│  │  - Búsqueda    │      │  - /api/git/*    │ │
│  │  - Backlinks   │      │  - /api/auth     │ │
│  └───────────────┘      └────────┬─────────┘ │
└──────────────────────────────────┼─────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │   Capa de acceso a datos    │
                     │   (fs + gray-matter + git)  │
                     └─────────────┬─────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │  CONTENT_DIR (repo git)     │
                     │  atlas-content/             │
                     │   ├── personal/             │
                     │   ├── tecnologia/            │
                     │   └── cultura/                │
                     └────────────────────────────┘
```

Todo corre en un único proceso Node (Next.js). No hay microservicios ni colas: la
complejidad no está justificada para un usuario y un servidor doméstico.

## 3. Estructura de carpetas del proyecto (código)

```
atlas/                          # repo de la app (este repo)
├── specs/                      # documentos SDD (este mismo conjunto)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/login/
│   │   ├── (atlas)/[...path]/  # visor/editor de documento o carpeta
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── tree/
│   │   │   ├── docs/[...path]/
│   │   │   ├── search/
│   │   │   └── git/[...path]/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── nav-tree/
│   │   ├── editor/
│   │   ├── preview/
│   │   ├── search/
│   │   └── backlinks/
│   ├── lib/
│   │   ├── fs.ts               # lectura/escritura segura dentro de CONTENT_DIR
│   │   ├── frontmatter.ts      # parseo con gray-matter
│   │   ├── git.ts              # commits, historial, diff (simple-git)
│   │   ├── links.ts            # resolución de wikilinks y backlinks
│   │   ├── search-index.ts     # índice en memoria
│   │   └── auth.ts             # sesión y verificación de credenciales
│   └── types/
├── .env.example                 # CONTENT_DIR, AUTH_USER, AUTH_PASSWORD_HASH, SESSION_SECRET
├── atlas-content-dev/            # contenido de ejemplo para desarrollo, gitignorado, su propio repo git
├── atlas-content/                 # ⚠️ solo en producción, gitignorado del repo de la app, su propio repo git
│   ├── README.md
│   ├── personal/
│   │   ├── index.md
│   │   └── pensamientos/
│   ├── tecnologia/
│   └── cultura/
└── package.json
```

`CONTENT_DIR` apunta, en desarrollo, a la carpeta de ejemplo `./atlas-content-dev`;
en producción, a `./atlas-content`, es decir, a `/home/pasta0126/atlas/atlas-content`
en la RPi (mismo host que ya sirve `northernarchive.com` y `sauron`). En ambos
casos es una carpeta **dentro** de la carpeta del repo de la app, pero **fuera**
del repo git de la app (listada en su `.gitignore`, igual que `atlas-content-dev`)
y con su propio repositorio git independiente. Mantenerla anidada en vez de como
carpeta hermana simplifica el despliegue: basta con un bind mount de
`~/atlas/atlas-content` para persistir el contenido, sin rutas adicionales en el
host. Dentro del contenedor se monta como volumen bind en `/content`.

## 4. Modelo de datos (sin BD — todo derivado del filesystem)

**Nodo del árbol** (carpeta o documento), calculado al vuelo leyendo `CONTENT_DIR`:

```ts
type NodeType = "folder" | "document";

interface AtlasNode {
  path: string; // ruta relativa dentro de CONTENT_DIR
  type: NodeType;
  title: string; // frontmatter.titulo o nombre de carpeta "humanizado"
  children?: AtlasNode[]; // solo si es folder
}
```

**Documento**:

```ts
interface Frontmatter {
  titulo?: string;
  fecha?: string;
  etiquetas?: string[];
  relacionados?: string[];
}

interface AtlasDocument {
  path: string;
  frontmatter: Frontmatter;
  content: string; // markdown crudo (sin frontmatter)
  backlinks: string[]; // rutas de documentos que enlazan a este
}
```

No hay caché persistente en v1: el árbol y el índice de búsqueda se reconstruyen en
memoria al arrancar el proceso y se invalidan/actualizan de forma incremental en
cada escritura. Es aceptable porque el volumen es personal.

## 5. API (rutas principales)

| Método | Ruta                                | Función                                                     |
| ------ | ----------------------------------- | ----------------------------------------------------------- |
| POST   | `/api/auth/login`                   | Verifica credenciales, crea cookie de sesión                |
| POST   | `/api/auth/logout`                  | Destruye la sesión                                          |
| GET    | `/api/tree`                         | Devuelve el árbol completo del atlas                        |
| GET    | `/api/docs/[...path]`               | Devuelve un documento (frontmatter + contenido + backlinks) |
| PUT    | `/api/docs/[...path]`               | Crea o actualiza un documento; dispara commit               |
| DELETE | `/api/docs/[...path]`               | Elimina un documento; dispara commit                        |
| POST   | `/api/docs/move`                    | Mueve/renombra un documento o carpeta; dispara commit       |
| POST   | `/api/folders`                      | Crea una carpeta (tema/subcategoría)                        |
| DELETE | `/api/folders/[...path]`            | Elimina una carpeta (con confirmación en UI)                |
| GET    | `/api/search?q=`                    | Búsqueda de texto/etiquetas                                 |
| GET    | `/api/git/history/[...path]`        | Historial de commits de un documento                        |
| GET    | `/api/git/diff/[...path]?from=&to=` | Diff entre dos commits de un documento                      |

Todas las rutas (excepto `/api/auth/login`) están protegidas por middleware que
verifica la cookie de sesión.

## 6. Seguridad

- Todas las rutas de escritura validan que el `path` resuelto quede **dentro** de
  `CONTENT_DIR` (protección contra path traversal, p. ej. `../../etc/passwd`).
- Contraseña del usuario nunca en texto plano: se guarda un hash (bcrypt/argon2) en
  variable de entorno, no en código.
- Cookie de sesión: `httpOnly`, `secure`, `sameSite=strict`, firmada con
  `SESSION_SECRET`.
- HTTPS ya lo resuelve Traefik (resolver `le`, HTTP-01) — la app no gestiona
  certificados ni termina TLS, solo escucha HTTP en la red interna `proxy`.

## 7. Git como motor de versionado

- Cada operación de escritura desde la API termina en:
  `git add <archivo>` → `git commit -m "<verbo>: <ruta>"` (p. ej. `editar: personal/pensamientos/identidad.md`).
- Los commits se hacen con un autor fijo configurable (nombre/email del usuario) vía env vars.
- El historial y diff se leen directamente de `git log`/`git diff` sobre el archivo,
  sin duplicar esa información en ningún otro sitio.

## 8. UI/UX — principios de diseño

- Layout de tres columnas (colapsables): árbol de navegación | editor+preview |
  backlinks/metadatos — inspirado en herramientas tipo Obsidian pero con estética
  propia, cálida, no corporativa.
- Tipografía serif o humanista para el contenido leído/escrito; sans-serif solo en
  chrome de UI mínimo.
- Sin dashboards, sin métricas, sin gamificación. El foco visual es siempre el texto.
- Modo oscuro/claro respetando preferencia del sistema.

## 9. Despliegue en la infraestructura existente

Inventario relevante del servidor (RPi 4, aarch64, DietPi v10.5.2, `192.168.1.10`,
7.7 GiB RAM, sin swap, 100 GB libres en `/`), ya en producción:

- **Traefik v3.7** en `~/infra/traefik` (`docker-compose.yml` + `traefik.yml`),
  contenedor `traefik`, red docker externa **`proxy`**, `exposedByDefault: false`
  (las apps deben marcar `traefik.enable=true` explícitamente), resolver ACME
  `le` vía HTTP-01 (no wildcard/DNS-01).
- **DNS dinámico** gestionado por `cdmon` (script + timer systemd), IP pública
  `79.116.22.49`. El dominio raíz `northernarchive.com` ya resuelve; los
  subdominios (p. ej. `sauron.northernarchive.com`) son registros **explícitos**,
  no hay wildcard — cada app nueva necesita su propio registro A en el panel de
  cdmon apuntando a la misma IP.
- **Convención de apps ya en marcha** (ver `sauron`, `northernarchive-api`): un
  proyecto por carpeta bajo `/home/pasta0126/<proyecto>/`, con su propio
  `docker-compose.yml`, sin puertos publicados al host (Traefik enruta por la red
  `proxy` interna), y labels Traefik del tipo:

  ```yaml
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.atlas.rule=Host(`atlas.northernarchive.com`)"
    - "traefik.http.routers.atlas.entrypoints=websecure"
    - "traefik.http.routers.atlas.tls.certresolver=le"
    - "traefik.http.services.atlas.loadbalancer.server.port=3000"
  ```

- **Importante (hallazgo documentado en `infra/ROADMAP.md`)**: imágenes
  `traefik:v3.1`/`v3.5` fallan contra el Docker Engine de esta RPi; ya está fijado
  en `v3.7` y no hace falta tocarlo, pero si algún día se toca revisar
  `docker logs traefik`.

### Ajustes al proyecto derivados de esta infraestructura

- **Subdominio propio**: `atlas.northernarchive.com`. Requiere, como paso manual
  único (fuera del código, panel de cdmon): dar de alta el registro A apuntando a
  `79.116.22.49`, igual que se hizo para `sauron`.
- **`docker-compose.yml` del proyecto**: sin `ports:` publicados; se une a la red
  externa `proxy` (`networks: { proxy: { external: true } }`) y expone el puerto
  interno de Next.js (3000) solo dentro de esa red, vía las labels de arriba.
- **Volumen de contenido**: bind mount `~/atlas/atlas-content:/content:rw` —
  subcarpeta dentro de la propia carpeta del repo de la app en el host, no una
  ruta hermana fuera de ella (ver §1 y §3) —, con `CONTENT_DIR=/content`. El
  contenedor debe correr con `user: "1001:1001"` (uid/gid de `pasta0126` en el
  host) para que
  los commits de git y los archivos creados no queden con permisos de root.
- **Imagen aarch64**: `Dockerfile` multi-stage sobre `node:20-alpine` (soporta
  `linux/arm64` de forma nativa). En el stage final instalar `git`
  (`apk add --no-cache git`), imprescindible porque `lib/git.ts` invoca el binario
  real.
- **Build en la propia RPi**: con 6-7 GiB libres y sin swap, un `next build`
  normal debería caber sin problema para un proyecto de este tamaño; si en algún
  momento el build se queda sin memoria, la alternativa es `docker buildx` cruzado
  desde otra máquina y `docker load`/push a un registro, pero no se anticipa
  necesario en v1 — no añadir esa complejidad por adelantado.
- **Sin firewall/puertos nuevos que abrir**: todo el tráfico entra por 80/443, ya
  gestionados por Traefik; el contenedor de la app no necesita puertos publicados
  al host.

## 10. Fuera de alcance v1 (explícito)

- Multiusuario y permisos.
- Publicación pública de documentos individuales.
- Restaurar versiones anteriores desde la UI (solo lectura de historial/diff en v1).
- Sincronización con servicios externos.
- Editor colaborativo en tiempo real.
