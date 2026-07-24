"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { AtlasNode } from "@/types/atlas";

function nodeHref(nodePath: string): string {
  const withoutExt = nodePath.endsWith(".md") ? nodePath.slice(0, -3) : nodePath;
  return `/${withoutExt}`;
}

function NavNode({ node, depth }: { node: AtlasNode; depth: number }) {
  const pathname = usePathname();
  const href = nodeHref(node.path);
  const isActive = pathname === href;
  const [open, setOpen] = useState(true);

  const linkClassName = `block truncate rounded px-2 py-1 text-sm ${
    isActive
      ? "bg-zinc-200 font-medium text-black dark:bg-zinc-800 dark:text-zinc-50"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
  }`;

  if (node.type === "document") {
    return (
      <li>
        <Link href={href} className={linkClassName} style={{ paddingLeft: `${depth * 0.75 + 1.25}rem` }}>
          {node.title}
        </Link>
      </li>
    );
  }

  const hasChildren = (node.children ?? []).length > 0;

  return (
    <li>
      <div className="flex items-center" style={{ paddingLeft: `${depth * 0.75}rem` }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={!hasChildren}
          className="w-5 shrink-0 text-xs text-zinc-500 disabled:opacity-30 dark:text-zinc-400"
          aria-label={open ? "Colapsar carpeta" : "Expandir carpeta"}
        >
          {hasChildren ? (open ? "▾" : "▸") : "·"}
        </button>
        <Link href={href} className={`${linkClassName} font-medium`}>
          {node.title}
        </Link>
      </div>
      {open && hasChildren && (
        <ul>
          {node.children!.map((child) => (
            <NavNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NavTree({ root }: { root: AtlasNode }) {
  return (
    <nav className="flex flex-col gap-1 overflow-y-auto p-3">
      <ul>
        {(root.children ?? []).map((child) => (
          <NavNode key={child.path} node={child} depth={0} />
        ))}
      </ul>
    </nav>
  );
}
