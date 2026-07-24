"use client";

import { useState } from "react";
import { NavTree } from "@/components/nav-tree/nav-tree";
import { SearchPalette } from "@/components/search/search-palette";
import type { AtlasNode } from "@/types/atlas";

export function AtlasShell({
  tree,
  children,
}: {
  tree: AtlasNode;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex flex-1 overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="absolute left-3 top-3 z-30 sm:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir navegación"
          className="rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-zinc-700 shadow-sm dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-300"
        >
          ☰
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setSidebarOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-black/[.08] bg-white transition-transform duration-200 dark:border-white/[.145] dark:bg-zinc-950 sm:static sm:z-auto sm:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavTree root={tree} />
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-950">
        {children}
      </main>
      <SearchPalette />
    </div>
  );
}
