# Requisitos — Atlas (motor web de gestión del atlas personal)

## 1. Visión

Un motor web personal, autoalojado, que permita crear, editar, organizar y navegar
una carpeta de documentos Markdown estructurada como un "atlas" (tema → subcategoría →
documento). El motor (código) y el contenido (los `.md`) son dos cosas separadas:
el motor es una aplicación genérica; el contenido es una carpeta de datos propia del
usuario, versionada con git, portable e independiente de la aplicación.

No es un gestor de notas corporativo ni un CMS. Debe sentirse íntimo, simple y con
libertad total sobre qué y cómo se escribe.

## 2. Alcance

- Un único usuario (el propietario del atlas). No hay multiusuario ni permisos por rol.
- Autoalojado, expuesto a internet (acceso remoto), por lo que requiere autenticación.
- El contenido vive en una carpeta en disco, versionada con git, cuya ruta es
  configurable — no está acoplada al código de la aplicación.

Fuera de alcance (v1): colaboración multiusuario, comentarios, publicación pública de
documentos, sincronización con servicios externos (Notion, Google Docs, etc.), apps
móviles nativas.

## 3. Requisitos funcionales (formato EARS)

### 3.1 Autenticación y acceso

- EL SISTEMA DEBERÁ exigir inicio de sesión antes de mostrar cualquier contenido del atlas.
- CUANDO un usuario no autenticado intente acceder a cualquier ruta protegida,
  EL SISTEMA DEBERÁ redirigirlo a una pantalla de login.
- EL SISTEMA DEBERÁ soportar un único usuario propietario, con credenciales configuradas
  vía variables de entorno (no un sistema de registro público).
- CUANDO el login sea correcto, EL SISTEMA DEBERÁ mantener la sesión mediante una cookie
  segura con expiración configurable.

### 3.2 Estructura y navegación del atlas

- EL SISTEMA DEBERÁ representar la jerarquía `tema → subcategoría → documento` como
  carpetas y archivos reales dentro de la carpeta de contenido.
- EL SISTEMA DEBERÁ mostrar un árbol de navegación lateral con temas, subcategorías y
  documentos, reflejando el estado real del sistema de archivos.
- CUANDO el usuario abra un tema o subcategoría que contenga un `index.md`,
  EL SISTEMA DEBERÁ mostrarlo como página de entrada de esa sección.
- EL SISTEMA DEBERÁ permitir crear, renombrar y eliminar carpetas (temas y
  subcategorías) desde la interfaz.
- CUANDO el usuario elimine una carpeta no vacía, EL SISTEMA DEBERÁ pedir confirmación
  explícita antes de proceder.

### 3.3 Gestión de documentos

- EL SISTEMA DEBERÁ permitir crear un documento nuevo dentro de cualquier
  carpeta, a partir de una plantilla base con frontmatter.
- EL SISTEMA DEBERÁ permitir editar el contenido Markdown y el frontmatter de un
  documento existente.
- EL SISTEMA DEBERÁ permitir renombrar y mover un documento entre carpetas.
- EL SISTEMA DEBERÁ permitir eliminar un documento, con confirmación previa.
- CUANDO el usuario edite un documento, EL SISTEMA DEBERÁ ofrecer una vista previa
  renderizada del Markdown, separada o simultánea a la edición (editor + preview).
- EL SISTEMA DEBERÁ soportar enlaces internos entre documentos (wikilinks `[[doc]]`
  o rutas relativas) y resolverlos como enlaces navegables al renderizar.
- CUANDO un documento contenga un enlace a otro documento inexistente,
  EL SISTEMA DEBERÁ señalarlo visualmente (enlace roto) sin bloquear el guardado.

### 3.4 Backlinks y relaciones

- EL SISTEMA DEBERÁ calcular y mostrar, en cada documento, la lista de otros
  documentos que enlazan hacia él (backlinks).

### 3.5 Búsqueda

- EL SISTEMA DEBERÁ permitir buscar documentos por título, ruta y contenido de texto.
- CUANDO el usuario ejecute una búsqueda, EL SISTEMA DEBERÁ devolver resultados
  ordenados por relevancia en menos de 1 segundo para atlas de tamaño personal
  (hasta varios miles de documentos).

### 3.6 Versionado (git)

- EL SISTEMA DEBERÁ tratar la carpeta de contenido como un repositorio git.
- CUANDO el usuario guarde un cambio (crear, editar, mover, eliminar), EL SISTEMA
  DEBERÁ generar un commit automático con un mensaje descriptivo del cambio.
- EL SISTEMA DEBERÁ permitir consultar el historial de commits de un documento
  concreto.
- EL SISTEMA DEBERÁ permitir ver el diff entre dos versiones de un documento.
- EL SISTEMA PODRÁ (opcional, v2) permitir restaurar una versión anterior de un
  documento.

### 3.7 Metadatos (frontmatter)

- EL SISTEMA DEBERÁ soportar campos de frontmatter: título, fecha, etiquetas,
  documentos relacionados — sin forzar ninguno como obligatorio salvo el título.
- EL SISTEMA DEBERÁ permitir filtrar/listar documentos por etiqueta.

## 4. Requisitos no funcionales

- **Simplicidad**: la interfaz no debe parecer una herramienta corporativa (Notion,
  Confluence). Prioriza tipografía cuidada, poco "chrome" de UI, foco en el texto.
- **Portabilidad del contenido**: si el usuario deja de usar la web, la carpeta de
  contenido debe seguir siendo un conjunto de `.md` perfectamente legible y usable
  con cualquier editor de texto o Obsidian/VSCode.
- **Independencia app/contenido**: el código de la aplicación no debe asumir un
  contenido concreto; la ruta a la carpeta de datos es configuración, no código.
- **Seguridad**: acceso remoto protegido por autenticación; sin esto, no se expone
  la app a internet.
- **Rendimiento**: operaciones de lectura/escritura de archivos y commits deben
  sentirse instantáneas para el volumen de un atlas personal (cientos-miles de
  documentos, no millones).
- **Responsive**: usable desde escritorio y móvil (al menos lectura y edición básica).

## 5. Criterios de aceptación (resumen)

El proyecto v1 se considera completo cuando el usuario puede, exclusivamente desde
la web y sin tocar el sistema de archivos a mano:

1. Iniciar sesión de forma segura.
2. Ver el árbol completo del atlas y navegar por temas/subcategorías/documentos.
3. Crear un tema, una subcategoría y un documento desde cero.
4. Editar un documento con preview en vivo y guardarlo (con commit automático).
5. Ver backlinks de un documento.
6. Buscar contenido por texto o etiqueta.
7. Ver el historial de cambios de un documento.
8. Mover/renombrar/eliminar documentos y carpetas con confirmación.
