import { readTree } from "@/lib/fs";
import { NavTree } from "@/components/nav-tree/nav-tree";
import { SearchPalette } from "@/components/search/search-palette";

export default async function AtlasLayout({ children }: { children: React.ReactNode }) {
  const tree = await readTree();

  return (
    <div className="flex flex-1 overflow-hidden bg-zinc-50 dark:bg-black">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950">
        <NavTree root={tree} />
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-950">
        {children}
      </main>
      <SearchPalette />
    </div>
  );
}
