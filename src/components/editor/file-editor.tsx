"use client";

import { useCallback, useEffect, useState } from "react";
import { PlainTextEditor } from "./plain-text-editor";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function apiPathFor(relativePath: string): string {
  return `/api/text/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Editor para ficheros de texto plano (yml, json, código, etc.) sin vista previa gráfica: solo el editor. */
export function FileEditor({ path, content }: { path: string; content: string }) {
  const [value, setValue] = useState(content);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const response = await fetch(apiPathFor(path), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }, [value, path]);

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
        <h1 className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">{path}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {status === "saving" && <span>Guardando…</span>}
          {status === "saved" && <span>Guardado</span>}
          {status === "error" && (
            <span className="text-red-600 dark:text-red-400">Error al guardar</span>
          )}
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
      <div className="flex flex-1 flex-col overflow-hidden">
        <PlainTextEditor value={value} onChange={setValue} />
      </div>
    </div>
  );
}
