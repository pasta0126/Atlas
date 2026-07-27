"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkdownEditor } from "./markdown-editor";
import { MetadataPanel } from "./metadata-panel";
import { Preview } from "@/components/preview/preview";
import { HistoryPanel } from "@/components/history/history-panel";
import { Backlinks } from "@/components/backlinks/backlinks";
import { CheckIcon, PencilIcon, XIcon } from "@/components/icons";
import type { AtlasDocument, Frontmatter } from "@/types/atlas";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type RightTab = "preview" | "historial" | "backlinks";
type DesktopRightTab = "historial" | "backlinks";
// En móvil solo se muestra una zona a la vez (editor o la pestaña
// seleccionada). En escritorio siempre hay 2 columnas: sin editar,
// izquierda = Preview y derecha = Historial/Backlinks; editando,
// izquierda = editor y derecha = Preview. No hay cabecera global: cada
// panel lleva sus propios controles.
type MobileView = "editor" | "right";

function apiPathFor(documentPath: string): string {
  return `/api/docs/${documentPath.split("/").map(encodeURIComponent).join("/")}`;
}

function tabClass(active: boolean): string {
  return `border-b-2 px-3 py-1.5 text-xs ${
    active
      ? "border-foreground font-medium text-zinc-900 dark:text-zinc-100"
      : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
  }`;
}

const iconButtonClass =
  "shrink-0 rounded-full p-1.5 text-zinc-600 hover:bg-black/[.06] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[.1] dark:hover:text-zinc-100";
const saveButtonClass =
  "shrink-0 rounded-full bg-foreground p-1.5 text-background hover:bg-[#383838] dark:hover:bg-[#ccc]";

export function DocumentEditor({
  document,
  docPaths,
}: {
  document: AtlasDocument;
  docPaths: string[];
}) {
  const [content, setContent] = useState(document.content);
  const [frontmatter, setFrontmatter] = useState<Frontmatter>(document.frontmatter);
  const [savedContent, setSavedContent] = useState(document.content);
  const [savedFrontmatter, setSavedFrontmatter] = useState<Frontmatter>(document.frontmatter);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [desktopRightTab, setDesktopRightTab] = useState<DesktopRightTab>("historial");
  const [mobileView, setMobileView] = useState<MobileView>("right");
  const [desktopEditing, setDesktopEditing] = useState(false);

  function startEditing() {
    setMobileView("editor");
    setDesktopEditing(true);
  }

  function cancelEditing() {
    setContent(savedContent);
    setFrontmatter(savedFrontmatter);
    setStatus("idle");
    setMobileView("right");
    setDesktopEditing(false);
  }

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const response = await fetch(apiPathFor(document.path), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontmatter, content }),
      });
      if (response.ok) {
        setSavedContent(content);
        setSavedFrontmatter(frontmatter);
        setStatus("saved");
      } else {
        setStatus("error");
      }
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
    <div className="flex flex-1 flex-col overflow-hidden sm:grid sm:grid-cols-2">
      <div
        className={`${mobileView === "editor" ? "flex" : "hidden"} flex-1 flex-col overflow-hidden sm:flex sm:border-r sm:border-black/[.08] sm:dark:border-white/[.145]`}
      >
        {desktopEditing ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-black/[.08] py-1 pl-14 pr-2 dark:border-white/[.145] sm:pl-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {status === "saving" && "Guardando…"}
                {status === "saved" && "Guardado"}
                {status === "error" && <span className="text-red-600 dark:text-red-400">Error al guardar</span>}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={cancelEditing}
                  aria-label="Cancelar"
                  title="Cancelar"
                  className={iconButtonClass}
                >
                  <XIcon className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={save}
                  aria-label="Guardar"
                  title="Guardar (Ctrl+S)"
                  className={saveButtonClass}
                >
                  <CheckIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
            <MetadataPanel frontmatter={frontmatter} onChange={setFrontmatter} />
            <MarkdownEditor value={content} onChange={setContent} />
          </>
        ) : (
          <>
            <div className="flex items-center justify-end border-b border-black/[.08] py-1 pr-2 dark:border-white/[.145]">
              <button
                type="button"
                onClick={startEditing}
                aria-label="Editar"
                title="Editar"
                className={iconButtonClass}
              >
                <PencilIcon className="h-[18px] w-[18px]" />
              </button>
            </div>
            <Preview content={content} docPath={document.path} docPaths={docPaths} />
          </>
        )}
      </div>
      <div className={`${mobileView === "right" ? "flex" : "hidden"} flex-1 flex-col overflow-hidden sm:flex`}>
        <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
          <div className="flex items-center justify-between border-b border-black/[.08] pl-14 pr-2 dark:border-white/[.145]">
            <div className="flex">
              <button type="button" onClick={() => setRightTab("preview")} className={tabClass(rightTab === "preview")}>
                Preview
              </button>
              <button
                type="button"
                onClick={() => setRightTab("historial")}
                className={tabClass(rightTab === "historial")}
              >
                Historial
              </button>
              <button
                type="button"
                onClick={() => setRightTab("backlinks")}
                className={tabClass(rightTab === "backlinks")}
              >
                Backlinks
                {document.backlinks.length > 0 && ` (${document.backlinks.length})`}
              </button>
            </div>
            <button
              type="button"
              onClick={startEditing}
              aria-label="Editar"
              title="Editar"
              className={iconButtonClass}
            >
              <PencilIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            {rightTab === "preview" && (
              <Preview content={content} docPath={document.path} docPaths={docPaths} />
            )}
            {rightTab === "historial" && (
              <HistoryPanel key={document.path} documentPath={document.path} />
            )}
            {rightTab === "backlinks" && <Backlinks paths={document.backlinks} />}
          </div>
        </div>
        <div className="hidden flex-1 flex-col overflow-hidden sm:flex">
          {desktopEditing ? (
            <Preview content={content} docPath={document.path} docPaths={docPaths} />
          ) : (
            <>
              <div className="flex border-b border-black/[.08] dark:border-white/[.145]">
                <button
                  type="button"
                  onClick={() => setDesktopRightTab("historial")}
                  className={tabClass(desktopRightTab === "historial")}
                >
                  Historial
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopRightTab("backlinks")}
                  className={tabClass(desktopRightTab === "backlinks")}
                >
                  Backlinks
                  {document.backlinks.length > 0 && ` (${document.backlinks.length})`}
                </button>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                {desktopRightTab === "historial" ? (
                  <HistoryPanel key={document.path} documentPath={document.path} />
                ) : (
                  <Backlinks paths={document.backlinks} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
