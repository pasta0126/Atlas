import Link from "next/link";
import { listDocumentsByTag } from "@/lib/tags";

// Ver nota en etiquetas/page.tsx: contenido dinámico, no prerenderizable.
export const dynamic = "force-dynamic";

function docHref(path: string): string {
  const withoutExt = path.endsWith(".md") ? path.slice(0, -3) : path;
  return `/${withoutExt}`;
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  const documents = await listDocumentsByTag(tag);

  return (
    <div className="flex-1 overflow-y-auto p-6 pl-14 sm:pl-6">
      <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/etiquetas" className="hover:underline">
          Etiquetas
        </Link>
      </p>
      <h1 className="mb-4 text-lg font-medium text-zinc-800 dark:text-zinc-200">#{tag}</h1>
      {documents.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ningún documento tiene la etiqueta &quot;{tag}&quot;.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li key={doc.path}>
              <Link
                href={docHref(doc.path)}
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {doc.title}
              </Link>
              <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">{doc.path}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
