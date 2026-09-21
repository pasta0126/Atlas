"use client";

import { useState } from "react";
import { NavTree } from "@/components/nav-tree/nav-tree";
import { SearchPalette } from "@/components/search/search-palette";
import { MenuIcon } from "@/components/icons";
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
    <div className="relative flex flex-1 overflow-hidden bg-background">
      <div className="absolute left-3 top-3 z-30 sm:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir navegación"
          className="rounded border border-border bg-surface p-1.5 text-zinc-700 shadow-sm dark:text-zinc-300"
        >
          <MenuIcon className="h-[18px] w-[18px]" />
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
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-border bg-surface transition-transform duration-200 sm:static sm:z-auto sm:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavTree root={tree} />
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        {children}
      </main>
      <SearchPalette />
    </div>
  );
}
