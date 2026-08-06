# Atlas

Motor web personal y autoalojado para gestionar un "atlas" de notas en
Markdown, organizado como tema → subcategoría → documento. El contenido vive
como archivos `.md` normales en una carpeta versionada con git, separada del
código de la aplicación: Atlas es solo el motor (lectura, edición, búsqueda,
navegación e historial), nunca el dueño de los datos.

Pensado para un único usuario, no para colaboración multiusuario ni para
publicar documentos al público.

## Características

- **Árbol de navegación** de carpetas y documentos, reflejando el sistema de
  archivos real de la carpeta de contenido.
- **Editor + preview** en dos columnas: sin editar se ve el preview
  renderizado junto al historial de versiones o los backlinks; al pulsar
  editar aparecen el editor Markdown (CodeMirror) y el preview en vivo.
- **Frontmatter estructurado** (título, fecha, etiquetas, documentos
  relacionados) editable desde un panel dedicado.
- **Wikilinks** (`[[documento]]` / `[[documento|texto]]`) entre notas, con
  **backlinks** automáticos (qué documentos enlazan a este).
- **Historial de versiones** por documento vía git (diffs incluidos).
- **Guardado versionado**: cada cambio se comitea automáticamente sobre la
  carpeta de contenido.
- **Búsqueda** en memoria (MiniSearch) sobre todo el contenido, con atajo de
  teclado (`Ctrl+K`).
- **Etiquetas**: listado y filtrado de documentos por etiqueta.
- **Gestión de archivos y carpetas**: crear, renombrar, mover (drag & drop) y
  eliminar documentos y carpetas.
- **Visor de ficheros no-Markdown**: texto plano e imágenes dentro del mismo
  árbol.
- **Autenticación** de usuario único (usuario + contraseña por variables de
  entorno), sin registro público.
- **Cifrado por documento**: cualquier documento se puede proteger con una
  frase secreta adicional. El cifrado (AES-256-GCM) y descifrado ocurren
  siempre en el navegador — el servidor nunca ve la frase ni el contenido en
  claro, solo almacena el sobre cifrado. Sin frase correcta no hay forma de
  recuperar el contenido (no hay recuperación ni "puerta trasera").

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, CodeMirror 6 para el
editor, `react-markdown`/`remark-gfm` para el preview, `simple-git` para las
operaciones de git y MiniSearch para el índice de búsqueda. Sin base de
datos: todo el estado vive en el sistema de archivos y en git.

Más detalle de las decisiones de arquitectura en [`specs/02-design.md`](specs/02-design.md).

## Requisitos

- Node.js 20+
- `git` instalado y accesible en el `PATH` (se usa para comitear los cambios
  sobre la carpeta de contenido)
- Una carpeta de contenido: cualquier directorio en disco (idealmente su
  propio repo git) donde vivirán los `.md`

## Configuración

Copia `.env.example` a `.env.local` y rellena las variables:

```bash
cp .env.example .env.local
```

| Variable             | Descripción                                                                         |
| -------------------- | ----------------------------------------------------------------------------------- |
| `CONTENT_DIR`        | Ruta absoluta a la carpeta de contenido (independiente de este repo).               |
| `AUTH_USER`          | Usuario único con acceso al atlas.                                                  |
| `AUTH_PASSWORD_HASH` | Hash bcrypt de la contraseña. Generar con `npx bcrypt-cli "tu-contraseña"`.         |
| `SESSION_SECRET`     | Cadena aleatoria larga para firmar la cookie de sesión (`openssl rand -base64 32`). |
| `GIT_AUTHOR_NAME`    | Nombre de autor para los commits automáticos sobre `CONTENT_DIR`.                   |
| `GIT_AUTHOR_EMAIL`   | Email de autor para esos mismos commits.                                            |

> Si el hash de bcrypt contiene `$`, escápalos (`\$`) al escribirlos en
> `.env.local`, o Next.js los interpretará como referencias a variables.

## Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. En desarrollo puedes apuntar `CONTENT_DIR` a
`atlas-content-dev/` (carpeta de ejemplo, ignorada por git) para no depender
de tu atlas real.

### Scripts

| Script                 | Qué hace                                  |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Servidor de desarrollo (Turbopack).       |
| `npm run build`        | Build de producción.                      |
| `npm start`            | Sirve el build de producción.             |
| `npm run lint`         | ESLint.                                   |
| `npm run format`       | Formatea con Prettier.                    |
| `npm run format:check` | Comprueba formato sin modificar archivos. |
| `npm test`             | Tests (Vitest).                           |
| `npm run test:watch`   | Tests en modo watch.                      |

## Despliegue

Incluye `Dockerfile` y `docker-compose.yml` para autoalojar en un servidor
propio detrás de un reverse proxy (pensado originalmente para Traefik, ver
`docker-compose.yml`). Necesitas un `.env.production` con las mismas
variables que `.env.example`, y montar `CONTENT_DIR` como volumen.

```bash
scripts/deploy.sh
```

El script hace `git pull`, reconstruye la imagen y levanta el contenedor con
`docker compose`.

## Licencia

Dominio público (Unlicense) — ver [`LICENSE`](LICENSE).
