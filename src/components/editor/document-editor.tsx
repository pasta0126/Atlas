"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkdownEditor } from "./markdown-editor";
import { Preview } from "@/components/preview/preview";
import { HistoryPanel } from "@/components/history/history-panel";
import { Backlinks } from "@/components/backlinks/backlinks";
import type { AtlasDocument } from "@/types/atlas";

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
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [rightTab, setRightTab] = useState<RightTab>("preview");

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const response = await fetch(apiPathFor(document.path), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontmatter: document.frontmatter, content }),
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }, [content, document.frontmatter, document.path]);

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
      <div className="flex items-center justify-between border-b border-black/[.08] px-4 py-2 dark:border-white/[.145]">
        <h1 className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {document.frontmatter.titulo ?? document.path}
        </h1>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {status === "saving" && <span>Guardando…</span>}
          {status === "saved" && <span>Guardado</span>}
          {status === "error" && (
            <span className="text-red-600 dark:text-red-400">Error al guardar</span>
          )}
          <div className="flex rounded-full border border-black/[.08] p-0.5 dark:border-white/[.145]">
            <button
              type="button"
              onClick={() => setRightTab("preview")}
              className={`rounded-full px-3 py-1 ${rightTab === "preview" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setRightTab("historial")}
              className={`rounded-full px-3 py-1 ${rightTab === "historial" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Historial
            </button>
            <button
              type="button"
              onClick={() => setRightTab("backlinks")}
              className={`rounded-full px-3 py-1 ${rightTab === "backlinks" ? "bg-black/[.06] dark:bg-white/[.1]" : ""}`}
            >
              Backlinks
              {document.backlinks.length > 0 && ` (${document.backlinks.length})`}
            </button>
          </div>
          <button
            type="button"
            onClick={save}
            className="rounded-full border border-black/[.08] px-3 py-1 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
          >
            Guardar (Ctrl+S)
          </button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 overflow-hidden">
        <div className="overflow-hidden border-r border-black/[.08] dark:border-white/[.145]">
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
        {rightTab === "preview" && (
          <Preview content={content} docPath={document.path} docPaths={docPaths} />
        )}
        {rightTab === "historial" && (
          <HistoryPanel key={document.path} documentPath={document.path} />
        )}
        {rightTab === "backlinks" && <Backlinks paths={document.backlinks} />}
      </div>
    </div>
  );
}
