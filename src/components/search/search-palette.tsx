"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  path: string;
  title: string;
  score: number;
  snippet: string;
}

function docHref(path: string): string {
  const withoutExt = path.endsWith(".md") ? path.slice(0, -3) : path;
  return `/${withoutExt}`;
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  function openPalette() {
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    setOpen(true);
  }

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("atlas:open-search", openPalette);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("atlas:open-search", openPalette);
    };
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || !trimmed) return;

    const controller = new AbortController();
    const debounce = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: SearchResult[]) => {
          setResults(data);
          setActiveIndex(0);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [query, open]);

  function goTo(result: SearchResult) {
    setOpen(false);
    router.push(docHref(result.path));
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      goTo(results[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-black/[.08] bg-white shadow-xl dark:border-white/[.145] dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Buscar por título, ruta o contenido…"
          className="w-full border-b border-black/[.08] bg-transparent px-4 py-3 text-sm outline-none dark:border-white/[.145]"
        />
        <ul className="max-h-80 overflow-y-auto">
          {results.map((result, index) => (
            <li key={result.path}>
              <button
                type="button"
                onClick={() => goTo(result)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`block w-full px-4 py-2 text-left ${
                  index === activeIndex ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <div className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {result.title}
                </div>
                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{result.path}</div>
                {result.snippet && (
                  <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {result.snippet}
                  </div>
                )}
              </button>
            </li>
          ))}
          {query.trim() !== "" && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Sin resultados.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
