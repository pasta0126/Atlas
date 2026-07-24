"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkdownEditor } from "./markdown-editor";
import { Preview } from "@/components/preview/preview";
import type { AtlasDocument } from "@/types/atlas";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function apiPathFor(documentPath: string): string {
  return `/api/docs/${documentPath.split("/").map(encodeURIComponent).join("/")}`;
}

export function DocumentEditor({ document }: { document: AtlasDocument }) {
  const [content, setContent] = useState(document.content);
  const [status, setStatus] = useState<SaveStatus>("idle");

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
        <Preview content={content} />
      </div>
    </div>
  );
}
