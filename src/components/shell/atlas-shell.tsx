"use client";

import { useEffect, useState } from "react";
import { NavTree } from "@/components/nav-tree/nav-tree";
import { SearchPalette } from "@/components/search/search-palette";
import { ChevronLeftIcon, ChevronRightIcon, MenuIcon } from "@/components/icons";
import type { AtlasNode } from "@/types/atlas";

const COLLAPSED_KEY = "atlas:sidebar-collapsed";

export function AtlasShell({
  tree,
  children,
}: {
  tree: AtlasNode;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Colapso del árbol en escritorio (en móvil el árbol ya es un panel
  // deslizante). Se recuerda por navegador; se lee tras montar para no
  // desincronizar la hidratación.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {}
  }

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

      {collapsed && (
        <div className="hidden shrink-0 flex-col items-center border-r border-border bg-surface py-3 sm:flex sm:w-10">
          <button
            type="button"
            onClick={() => toggleCollapsed(false)}
            aria-label="Mostrar árbol"
            title="Mostrar árbol"
            className="rounded p-1 text-zinc-500 hover:bg-surface-hover hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <aside
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setSidebarOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-border bg-surface transition-transform duration-200 sm:static sm:z-auto sm:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "sm:hidden" : ""}`}
      >
        <NavTree
          root={tree}
          headerAction={
            <button
              type="button"
              onClick={() => toggleCollapsed(true)}
              aria-label="Ocultar árbol"
              title="Ocultar árbol"
              className="hidden shrink-0 rounded p-1 text-zinc-400 hover:bg-surface-hover hover:text-zinc-700 dark:hover:text-zinc-200 sm:block"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          }
        />
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        {children}
      </main>
      <SearchPalette />
    </div>
  );
}
