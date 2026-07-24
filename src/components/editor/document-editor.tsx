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
              onClick={() => setRightTab("preview")}
              className={`rounded-full px-2 py-1 sm:px-3 ${rightTab === "preview" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setRightTab("historial")}
              className={`rounded-full px-2 py-1 sm:px-3 ${rightTab === "historial" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Historial
            </button>
            <button
              type="button"
              onClick={() => setRightTab("backlinks")}
              className={`rounded-full px-2 py-1 sm:px-3 ${rightTab === "backlinks" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Backlinks
              {document.backlinks.length > 0 && ` (${document.backlinks.length})`}
            </button>
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
      <MetadataPanel frontmatter={frontmatter} onChange={setFrontmatter} />
      <div className="grid flex-1 grid-cols-1 overflow-y-auto sm:grid-cols-2 sm:overflow-hidden">
        <div className="h-[55vh] overflow-hidden border-b border-black/[.08] dark:border-white/[.145] sm:h-auto sm:border-r sm:border-b-0">
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
        <div className="h-[55vh] overflow-hidden sm:h-auto">
          {rightTab === "preview" && (
            <Preview content={content} docPath={document.path} docPaths={docPaths} />
          )}
          {rightTab === "historial" && (
            <HistoryPanel key={document.path} documentPath={document.path} />
          )}
          {rightTab === "backlinks" && <Backlinks paths={document.backlinks} />}
        </div>
      </div>
    </div>
  );
}
