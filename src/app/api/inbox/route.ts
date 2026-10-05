import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifyInboxToken, verifySessionToken } from "@/lib/auth";
import { commitChange } from "@/lib/git";
import { createInboxNote } from "@/lib/inbox";
import { invalidateSearchIndex } from "@/lib/search-index";

const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Captura rápida de notas desde fuera del navegador (p. ej. `curl` desde un
 * equipo donde la web está bloqueada). Ruta pública en `proxy.ts`: la
 * autenticación se hace aquí, con `Authorization: Bearer <token>` (ver
 * `verifyInboxToken`) o con la cookie de sesión normal.
 *
 * Cuerpo: texto plano (el título opcional va en `?titulo=`) o JSON
 * `{ contenido, titulo? }`.
 */
export async function POST(request: NextRequest) {
  const authenticated =
    verifyInboxToken(request.headers.get("authorization")) ||
    verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!authenticated) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf-8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Nota demasiado grande (máx. 1 MB)" },
      { status: 413 },
    );
  }

  let contenido: unknown = raw;
  let titulo: unknown = request.nextUrl.searchParams.get("titulo") ?? undefined;
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();
    contenido = body?.contenido;
    titulo = body?.titulo ?? titulo;
  }

  if (typeof contenido !== "string" || contenido.trim() === "") {
    return NextResponse.json({ error: "La nota está vacía" }, { status: 400 });
  }
  if (titulo !== undefined && typeof titulo !== "string") {
    return NextResponse.json({ error: "Título inválido" }, { status: 400 });
  }

  try {
    const path = await createInboxNote(contenido, titulo);
    await commitChange(path, `crear: ${path}`);
    invalidateSearchIndex();
    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    console.error("[inbox] no se ha podido crear la nota:", error);
    return NextResponse.json({ error: "No se ha podido crear la nota" }, { status: 500 });
  }
}
