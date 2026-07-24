import Link from "next/link";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolveMarkdownHref, wikilinksToMarkdown } from "@/lib/links";

// react-markdown sanea por defecto cualquier esquema de URL no reconocido (protección
// XSS) y el pseudo-esquema `wikilink:` que usamos para marcar wikilinks cae ahí: hay
// que declararlo explícitamente como seguro o el href queda vacío.
function urlTransform(url: string): string {
  return url.startsWith("wikilink:") ? url : defaultUrlTransform(url);
}

interface PreviewProps {
  content: string;
  docPath: string;
  docPaths: string[];
}

export function Preview({ content, docPath, docPaths }: PreviewProps) {
  const docPathSet = new Set(docPaths);

  const components: Components = {
    a: ({ href, children }) => {
      const resolved = href ? resolveMarkdownHref(href, docPath, docPathSet) : undefined;

      if (resolved === undefined) {
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      }

      if (resolved === null) {
        return (
          <span
            className="cursor-not-allowed text-red-600 no-underline decoration-dashed dark:text-red-400"
            title="Enlace roto: el documento no existe"
          >
            {children}
          </span>
        );
      }

      return <Link href={`/${resolved.replace(/\.md$/, "")}`}>{children}</Link>;
    },
  };

  return (
    <div className="prose prose-zinc max-w-none overflow-y-auto p-6 dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={urlTransform}>
        {wikilinksToMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
