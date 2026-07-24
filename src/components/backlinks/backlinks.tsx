import Link from "next/link";

export function Backlinks({ paths }: { paths: string[] }) {
  if (paths.length === 0) {
    return (
      <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
        Ningún documento enlaza todavía a este.
      </p>
    );
  }

  return (
    <div className="overflow-y-auto p-6">
      <ul className="flex flex-col gap-1">
        {paths.map((backlinkPath) => (
          <li key={backlinkPath}>
            <Link
              href={`/${backlinkPath.replace(/\.md$/, "")}`}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {backlinkPath}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
