/** Visor de sólo lectura para ficheros de imagen. */
export function ImageViewer({ path }: { path: string }) {
  const src = `/api/raw/${path.split("/").map(encodeURIComponent).join("/")}`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-black/[.08] py-2 pl-14 pr-4 dark:border-white/[.145] sm:pl-4">
        <h1 className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">{path}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={path} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  );
}
