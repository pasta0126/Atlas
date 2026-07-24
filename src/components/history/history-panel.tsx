"use client";

import { useEffect, useState } from "react";

interface CommitInfo {
  hash: string;
  date: string;
  message: string;
}

function apiPathFor(base: string, documentPath: string): string {
  return `${base}/${documentPath.split("/").map(encodeURIComponent).join("/")}`;
}

function DiffLine({ line }: { line: string }) {
  const color = line.startsWith("+") && !line.startsWith("+++")
    ? "text-green-700 dark:text-green-400"
    : line.startsWith("-") && !line.startsWith("---")
      ? "text-red-700 dark:text-red-400"
      : "text-zinc-500 dark:text-zinc-400";
  return <div className={color}>{line || " "}</div>;
}

export function HistoryPanel({ documentPath }: { documentPath: string }) {
  const [commits, setCommits] = useState<CommitInfo[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    fetch(apiPathFor("/api/git/history", documentPath))
      .then((response) => response.json())
      .then(setCommits)
      .catch(() => setCommits([]));
  }, [documentPath]);

  async function showDiff(hash: string) {
    setSelected(hash);
    setLoadingDiff(true);
    setDiffText(null);
    try {
      const response = await fetch(
        `${apiPathFor("/api/git/diff", documentPath)}?from=${encodeURIComponent(`${hash}^`)}&to=${encodeURIComponent(hash)}`,
      );
      const data = await response.json();
      setDiffText(response.ok ? data.diff : (data.error ?? "No se ha podido cargar el diff"));
    } catch {
      setDiffText("No se ha podido cargar el diff");
    } finally {
      setLoadingDiff(false);
    }
  }

  if (commits === null) {
    return <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Cargando historial…</p>;
  }

  if (commits.length === 0) {
    return <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Sin historial todavía.</p>;
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ul className="w-64 shrink-0 overflow-y-auto border-r border-black/[.08] p-2 dark:border-white/[.145]">
        {commits.map((commit) => (
          <li key={commit.hash}>
            <button
              type="button"
              onClick={() => showDiff(commit.hash)}
              className={`block w-full rounded px-2 py-1.5 text-left text-xs ${
                selected === commit.hash
                  ? "bg-zinc-200 dark:bg-zinc-800"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <div className="truncate text-zinc-800 dark:text-zinc-200">{commit.message}</div>
              <div className="text-zinc-500 dark:text-zinc-400">
                {new Date(commit.date).toLocaleString()} · {commit.hash.slice(0, 7)}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex-1 overflow-y-auto p-4">
        {!selected && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Selecciona un commit para ver los cambios.
          </p>
        )}
        {selected && loadingDiff && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando diff…</p>
        )}
        {selected && !loadingDiff && diffText !== null && (
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {diffText.split("\n").map((line, index) => (
              <DiffLine key={index} line={line} />
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}
