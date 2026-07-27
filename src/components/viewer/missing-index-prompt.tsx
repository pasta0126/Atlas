"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function humanize(name: string): string {
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MissingIndexPrompt({ folderPath }: { folderPath: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titulo = humanize(folderPath.split("/").filter(Boolean).pop() ?? "Índice");

  async function createIndex() {
    setCreating(true);
    setError(null);
    try {
      const segments = [...folderPath.split("/").filter(Boolean), "index.md"];
      const response = await fetch(`/api/docs/${segments.map(encodeURIComponent).join("/")}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontmatter: { titulo },
          content: `# ${titulo}\n`,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "No se ha podido crear el índice");
        return;
      }
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
      <p>Esta carpeta todavía no tiene un index.md.</p>
      <button
        type="button"
        onClick={createIndex}
        disabled={creating}
        className="rounded-full bg-foreground px-4 py-2 font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {creating ? "Creando…" : "Crear index.md"}
      </button>
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
