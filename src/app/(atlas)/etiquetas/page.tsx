import Link from "next/link";
import { listTags } from "@/lib/tags";

export default async function TagsPage() {
  const tags = await listTags();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="mb-4 text-lg font-medium text-zinc-800 dark:text-zinc-200">Etiquetas</h1>
      {tags.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ningún documento tiene etiquetas todavía.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                href={`/etiquetas/${encodeURIComponent(tag)}`}
                className="rounded-full border border-black/[.08] px-3 py-1 text-sm text-zinc-700 hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
              >
                {tag} <span className="text-zinc-400 dark:text-zinc-500">({count})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
