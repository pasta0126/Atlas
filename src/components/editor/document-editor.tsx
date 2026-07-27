"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkdownEditor } from "./markdown-editor";
import { MetadataPanel } from "./metadata-panel";
import { Preview } from "@/components/preview/preview";
import { HistoryPanel } from "@/components/history/history-panel";
import { Backlinks } from "@/components/backlinks/backlinks";
import type { AtlasDocument, Frontmatter } from "@/types/atlas";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type RightTab = "preview" | "historial" | "backlinks";
type DesktopRightTab = "historial" | "backlinks";
// En móvil solo se muestra una zona a la vez (editor o la pestaña
// seleccionada). En escritorio siempre hay 2 columnas: sin editar,
// izquierda = Preview y derecha = Historial/Backlinks; editando,
// izquierda = editor y derecha = Preview.
type MobileView = "editor" | "right";

function apiPathFor(documentPath: string): string {
  return `/api/docs/${documentPath.split("/").map(encodeURIComponent).join("/")}`;
}

export function DocumentEditor({
  document,
  docPaths,
}: {
  document: AtlasDocument;
  docPaths: string[];
}) {
  const [content, setContent] = useState(document.content);
  const [frontmatter, setFrontmatter] = useState<Frontmatter>(document.frontmatter);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [desktopRightTab, setDesktopRightTab] = useState<DesktopRightTab>("historial");
  const [mobileView, setMobileView] = useState<MobileView>("right");
  const [desktopEditing, setDesktopEditing] = useState(false);

  function showRightTab(tab: RightTab) {
    setRightTab(tab);
    setMobileView("right");
  }

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const response = await fetch(apiPathFor(document.path), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontmatter, content }),
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }, [content, frontmatter, document.path]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [save]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-b border-black/[.08] py-2 pl-14 pr-4 dark:border-white/[.145] sm:pl-4">
        <h1 className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {frontmatter.titulo ?? document.path}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {status === "saving" && <span>Guardando…</span>}
          {status === "saved" && <span>Guardado</span>}
          {status === "error" && (
            <span className="text-red-600 dark:text-red-400">Error al guardar</span>
          )}
          <div className="flex rounded-full border border-black/[.08] p-0.5 dark:border-white/[.145]">
            <button
              type="button"
              onClick={() => {
                setMobileView("editor");
                setDesktopEditing(true);
              }}
              className={`rounded-full px-2 py-1 sm:hidden ${mobileView === "editor" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setDesktopEditing((value) => !value)}
              className={`hidden rounded-full px-3 py-1 sm:inline-block ${desktopEditing ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => showRightTab("preview")}
              className={`rounded-full px-2 py-1 sm:hidden ${mobileView === "right" && rightTab === "preview" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => showRightTab("historial")}
              className={`rounded-full px-2 py-1 sm:hidden ${mobileView === "right" && rightTab === "historial" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Historial
            </button>
            <button
              type="button"
              onClick={() => showRightTab("backlinks")}
              className={`rounded-full px-2 py-1 sm:hidden ${mobileView === "right" && rightTab === "backlinks" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Backlinks
              {document.backlinks.length > 0 && ` (${document.backlinks.length})`}
            </button>
            {!desktopEditing && (
              <>
                <button
                  type="button"
                  onClick={() => setDesktopRightTab("historial")}
                  className={`hidden rounded-full px-3 py-1 sm:inline-block ${desktopRightTab === "historial" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
                >
                  Historial
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopRightTab("backlinks")}
                  className={`hidden rounded-full px-3 py-1 sm:inline-block ${desktopRightTab === "backlinks" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
                >
                  Backlinks
                  {document.backlinks.length > 0 && ` (${document.backlinks.length})`}
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-foreground px-3 py-1 font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            <span className="sm:hidden">Guardar</span>
            <span className="hidden sm:inline">Guardar (Ctrl+S)</span>
          </button>
        </div>
      </div>
      {desktopEditing && <MetadataPanel frontmatter={frontmatter} onChange={setFrontmatter} />}
      <div className="flex flex-1 flex-col overflow-hidden sm:grid sm:grid-cols-2">
        <div
          className={`${mobileView === "editor" ? "flex" : "hidden"} flex-1 flex-col overflow-hidden sm:flex sm:border-r sm:border-black/[.08] sm:dark:border-white/[.145]`}
        >
          {desktopEditing ? (
            <MarkdownEditor value={content} onChange={setContent} />
          ) : (
            <Preview content={content} docPath={document.path} docPaths={docPaths} />
          )}
        </div>
        <div className={`${mobileView === "right" ? "flex" : "hidden"} flex-1 flex-col overflow-hidden sm:flex`}>
          <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
            {rightTab === "preview" && (
              <Preview content={content} docPath={document.path} docPaths={docPaths} />
            )}
            {rightTab === "historial" && (
              <HistoryPanel key={document.path} documentPath={document.path} />
            )}
            {rightTab === "backlinks" && <Backlinks paths={document.backlinks} />}
          </div>
          <div className="hidden flex-1 flex-col overflow-hidden sm:flex">
            {desktopEditing ? (
              <Preview content={content} docPath={document.path} docPaths={docPaths} />
            ) : desktopRightTab === "historial" ? (
              <HistoryPanel key={document.path} documentPath={document.path} />
            ) : (
              <Backlinks paths={document.backlinks} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
