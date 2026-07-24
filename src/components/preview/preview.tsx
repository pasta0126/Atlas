import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Preview({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc max-w-none overflow-y-auto p-6 dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
