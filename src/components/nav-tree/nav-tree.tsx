"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { AtlasNode } from "@/types/atlas";
import { classifyFile } from "@/lib/file-kind";

function nodeHref(nodePath: string): string {
  const withoutExt = nodePath.endsWith(".md") ? nodePath.slice(0, -3) : nodePath;
  return `/${withoutExt}`;
}

// Identifica los eventos de drag-and-drop propios del árbol (frente a, p.
// ej., arrastrar texto o ficheros del sistema operativo sobre la página).
const DRAG_MIME_TYPE = "application/x-atlas-node-path";

function basename(nodePath: string): string {
  const idx = nodePath.lastIndexOf("/");
  return idx === -1 ? nodePath : nodePath.slice(idx + 1);
}

function joinPath(folder: string, name: string): string {
  return folder === "." || folder === "" ? name : `${folder}/${name}`;
}

function isSelfOrDescendant(ancestor: string, candidate: string): boolean {
  return candidate === ancestor || candidate.startsWith(`${ancestor}/`);
}

const FILE_ICONS: Record<string, string> = {
  pdf: "📕",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  gif: "🖼️",
  svg: "🖼️",
  ico: "🖼️",
  psd: "🖼️",
  json: "🔧",
  yml: "⚙️",
  yaml: "⚙️",
  sh: "💻",
  ps1: "💻",
  py: "💻",
  azw3: "📚",
  epub: "📚",
  kdbx: "🔒",
  pages: "📄",
};

function fileIcon(title: string): string {
  const ext = title.includes(".") ? title.split(".").pop()!.toLowerCase() : "";
  return FILE_ICONS[ext] ?? "📎";
}

function nodeIcon(node: AtlasNode, open?: boolean): string {
  if (node.type === "folder") return open ? "📂" : "📁";
  if (node.type === "document") return "📄";
  return fileIcon(node.title);
}

async function createDocument(folder: string, titulo: string): Promise<AtlasNode | null> {
  const response = await fetch("/api/docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, titulo }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    window.alert(data?.error ?? "No se ha podido crear el documento");
    return null;
  }
  return response.json();
}

async function createFolder(parent: string, nombre: string): Promise<boolean> {
  const response = await fetch("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parent, nombre }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    window.alert(data?.error ?? "No se ha podido crear la carpeta");
    return false;
  }
  return true;
}

async function movePath(from: string, to: string): Promise<boolean> {
  const response = await fetch("/api/docs/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    window.alert(data?.error ?? "No se ha podido mover");
    return false;
  }
  return true;
}

/** Mueve `from` dentro de la carpeta `targetFolder`, conservando su nombre. Devuelve la ruta final o null si no se ha movido. */
async function moveIntoFolder(from: string, targetFolder: string): Promise<string | null> {
  if (isSelfOrDescendant(from, targetFolder)) {
    window.alert("No se puede mover una carpeta dentro de sí misma o de su propio contenido");
    return null;
  }
  const to = joinPath(targetFolder, basename(from));
  if (to === from) return null;
  const ok = await movePath(from, to);
  return ok ? to : null;
}

async function deleteDocument(relativePath: string): Promise<boolean> {
  const response = await fetch(`/api/docs/${relativePath.split("/").map(encodeURIComponent).join("/")}`, {
    method: "DELETE",
  });
  return response.ok;
}

async function deleteFolder(relativePath: string, force: boolean): Promise<"ok" | "not-empty" | "error"> {
  const url = `/api/folders/${relativePath.split("/").map(encodeURIComponent).join("/")}${force ? "?force=true" : ""}`;
  const response = await fetch(url, { method: "DELETE" });
  if (response.ok) return "ok";
  if (response.status === 409) return "not-empty";
  return "error";
}

function NodeMenu({ children }: { children: React.ReactNode }) {
  return (
    <details className="relative shrink-0 opacity-0 group-hover:opacity-100 [&[open]]:opacity-100">
      <summary className="cursor-pointer list-none px-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
        ⋯
      </summary>
      <div className="absolute right-0 z-10 mt-1 flex flex-col gap-0.5 rounded border border-black/[.08] bg-white p-1 text-xs shadow-lg dark:border-white/[.145] dark:bg-zinc-900">
        {children}
      </div>
    </details>
  );
}

function MenuButton({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded px-2 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        danger ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function NavNode({ node, depth }: { node: AtlasNode; depth: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const href = nodeHref(node.path);
  const isActive = pathname === href;
  const isAncestorOfActive = pathname === `/${node.path}` || pathname.startsWith(`/${node.path}/`);
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [wasAncestor, setWasAncestor] = useState(isAncestorOfActive);
  const [isDropTarget, setIsDropTarget] = useState(false);
  // Cuando la ruta activa entra bajo esta carpeta, se olvida cualquier
  // colapso manual previo para que el árbol siempre revele el fichero actual.
  if (isAncestorOfActive !== wasAncestor) {
    setWasAncestor(isAncestorOfActive);
    if (isAncestorOfActive) setManualOpen(null);
  }
  const open = manualOpen ?? isAncestorOfActive;

  const linkClassName = `flex items-center gap-1.5 truncate rounded px-2 py-1 text-sm ${
    isActive
      ? "bg-zinc-200 font-medium text-black ring-1 ring-inset ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
  }`;

  async function handleRenameOrMove() {
    const destino = window.prompt(`Nueva ruta para "${node.title}"`, node.path);
    if (!destino || destino === node.path) return;
    const wasActive = isActive;
    const ok = await movePath(node.path, destino);
    if (ok) {
      if (wasActive) router.push(nodeHref(destino));
      router.refresh();
    }
  }

  async function handleDeleteDocument() {
    if (!window.confirm(`¿Eliminar el documento "${node.title}"?`)) return;
    const ok = await deleteDocument(node.path);
    if (ok) {
      if (isActive) router.push("/");
      router.refresh();
    } else {
      window.alert("No se ha podido eliminar el documento");
    }
  }

  async function handleDeleteFolder() {
    if (!window.confirm(`¿Eliminar la carpeta "${node.title}" y su contenido?`)) return;
    let result = await deleteFolder(node.path, false);
    if (result === "not-empty") {
      if (!window.confirm(`"${node.title}" no está vacía. ¿Eliminarla igualmente con todo su contenido?`)) {
        return;
      }
      result = await deleteFolder(node.path, true);
    }
    if (result === "ok") {
      if (pathname === href || pathname.startsWith(`${href}/`)) router.push("/");
      router.refresh();
    } else {
      window.alert("No se ha podido eliminar la carpeta");
    }
  }

  async function handleNewDocument() {
    const titulo = window.prompt("Título del nuevo documento");
    if (!titulo) return;
    const created = await createDocument(node.path, titulo);
    if (created) {
      router.push(nodeHref(created.path));
      router.refresh();
    }
  }

  async function handleNewFolder() {
    const nombre = window.prompt("Nombre de la nueva carpeta");
    if (!nombre) return;
    if (await createFolder(node.path, nombre)) {
      setManualOpen(true);
      router.refresh();
    }
  }

  function handleDragStart(event: React.DragEvent) {
    event.dataTransfer.setData(DRAG_MIME_TYPE, node.path);
    event.dataTransfer.effectAllowed = "move";
  }

  function isValidDrag(event: React.DragEvent): boolean {
    return node.type === "folder" && event.dataTransfer.types.includes(DRAG_MIME_TYPE);
  }

  function handleDragOver(event: React.DragEvent) {
    if (!isValidDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDragEnter(event: React.DragEvent) {
    if (!isValidDrag(event)) return;
    event.preventDefault();
    setIsDropTarget(true);
  }

  function handleDragLeave() {
    setIsDropTarget(false);
  }

  async function handleDrop(event: React.DragEvent) {
    if (!isValidDrag(event)) return;
    event.preventDefault();
    setIsDropTarget(false);
    const from = event.dataTransfer.getData(DRAG_MIME_TYPE);
    if (!from) return;
    const fromHref = nodeHref(from);
    const wasActive = pathname === fromHref || pathname.startsWith(`${fromHref}/`);
    const to = await moveIntoFolder(from, node.path);
    if (to) {
      if (wasActive) router.push(nodeHref(to));
      setManualOpen(true);
      router.refresh();
    }
  }

  if (node.type === "file" && classifyFile(node.title) === "unsupported") {
    return (
      <li
        className="flex items-center gap-1.5 truncate rounded px-2 py-1 text-sm text-zinc-400 dark:text-zinc-600"
        style={{ paddingLeft: `${depth * 0.75 + 1.25}rem` }}
        title={`${node.title} (no se puede abrir)`}
      >
        <span aria-hidden>{nodeIcon(node)}</span>
        <span className="truncate">{node.title}</span>
      </li>
    );
  }

  if (node.type === "document" || node.type === "file") {
    return (
      <li className="group flex items-center" draggable onDragStart={handleDragStart}>
        <Link href={href} className={linkClassName} style={{ paddingLeft: `${depth * 0.75 + 1.25}rem` }}>
          <span aria-hidden>{nodeIcon(node)}</span>
          <span className="truncate">{node.title}</span>
        </Link>
        <NodeMenu>
          <MenuButton onClick={handleRenameOrMove}>Renombrar / mover</MenuButton>
          <MenuButton onClick={handleDeleteDocument} danger>
            Eliminar
          </MenuButton>
        </NodeMenu>
      </li>
    );
  }

  const hasChildren = (node.children ?? []).length > 0;

  return (
    <li>
      <div
        className={`group flex items-center rounded ${isDropTarget ? "bg-blue-100 ring-1 ring-inset ring-blue-400 dark:bg-blue-500/20 dark:ring-blue-500" : ""}`}
        style={{ paddingLeft: `${depth * 0.75}rem` }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <button
          type="button"
          onClick={() => setManualOpen(!open)}
          disabled={!hasChildren}
          className="w-5 shrink-0 text-xs text-zinc-500 disabled:opacity-30 dark:text-zinc-400"
          aria-label={open ? "Colapsar carpeta" : "Expandir carpeta"}
        >
          {hasChildren ? (open ? "▾" : "▸") : "·"}
        </button>
        <Link href={href} className={`${linkClassName} flex-1 font-medium`}>
          <span aria-hidden>{nodeIcon(node, open)}</span>
          {node.title}
        </Link>
        <NodeMenu>
          <MenuButton onClick={handleNewDocument}>Nuevo documento aquí</MenuButton>
          <MenuButton onClick={handleNewFolder}>Nueva carpeta aquí</MenuButton>
          <MenuButton onClick={handleRenameOrMove}>Renombrar / mover</MenuButton>
          <MenuButton onClick={handleDeleteFolder} danger>
            Eliminar
          </MenuButton>
        </NodeMenu>
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
  const router = useRouter();
  const pathname = usePathname();
  const [isRootDropTarget, setIsRootDropTarget] = useState(false);

  function isValidDrag(event: React.DragEvent): boolean {
    return event.dataTransfer.types.includes(DRAG_MIME_TYPE);
  }

  function handleRootDragOver(event: React.DragEvent) {
    if (!isValidDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleRootDragEnter(event: React.DragEvent) {
    if (!isValidDrag(event)) return;
    event.preventDefault();
    setIsRootDropTarget(true);
  }

  function handleRootDragLeave() {
    setIsRootDropTarget(false);
  }

  async function handleRootDrop(event: React.DragEvent) {
    if (!isValidDrag(event)) return;
    event.preventDefault();
    setIsRootDropTarget(false);
    const from = event.dataTransfer.getData(DRAG_MIME_TYPE);
    if (!from) return;
    const fromHref = nodeHref(from);
    const wasActive = pathname === fromHref || pathname.startsWith(`${fromHref}/`);
    const to = await moveIntoFolder(from, ".");
    if (to) {
      if (wasActive) router.push(nodeHref(to));
      router.refresh();
    }
  }

  async function handleNewDocument() {
    const titulo = window.prompt("Título del nuevo documento");
    if (!titulo) return;
    const created = await createDocument(".", titulo);
    if (created) {
      router.push(nodeHref(created.path));
      router.refresh();
    }
  }

  async function handleNewFolder() {
    const nombre = window.prompt("Nombre de la nueva carpeta");
    if (!nombre) return;
    if (await createFolder(".", nombre)) {
      router.refresh();
    }
  }

  return (
    <nav className="flex h-full flex-col overflow-y-auto p-3">
      <Link
        href="/"
        className="mb-2 truncate rounded px-2 py-1 text-sm font-semibold tracking-tight text-zinc-800 hover:bg-black/[.04] dark:text-zinc-100 dark:hover:bg-white/[.06]"
      >
        Atlas
      </Link>
      <div className="mb-2 grid grid-cols-2 gap-1 border-b border-black/[.08] pb-2 text-xs dark:border-white/[.145]">
        <button
          type="button"
          onClick={handleNewDocument}
          className="rounded px-2 py-1 text-left text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
        >
          + Documento
        </button>
        <button
          type="button"
          onClick={handleNewFolder}
          className="rounded px-2 py-1 text-left text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
        >
          + Carpeta
        </button>
        <Link
          href="/etiquetas"
          className="rounded px-2 py-1 text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
        >
          Etiquetas
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("atlas:open-search"))}
          className="rounded px-2 py-1 text-left text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/[.06]"
        >
          Buscar (Ctrl+K)
        </button>
      </div>
      <ul
        className={`min-h-[3rem] flex-1 rounded ${isRootDropTarget ? "bg-blue-100 ring-1 ring-inset ring-blue-400 dark:bg-blue-500/20 dark:ring-blue-500" : ""}`}
        onDragOver={handleRootDragOver}
        onDragEnter={handleRootDragEnter}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
        title="Suelta aquí para mover a la raíz"
      >
        {(root.children ?? []).map((child) => (
          <NavNode key={child.path} node={child} depth={0} />
        ))}
      </ul>
    </nav>
  );
}
