import { notFound } from "next/navigation";
import { folderExists, listDocumentPaths, resolveRouteDocument } from "@/lib/fs";
import { readTextFile } from "@/lib/plain-files";
import { classifyFile } from "@/lib/file-kind";
import { DocumentEditor } from "@/components/editor/document-editor";
import { FileEditor } from "@/components/editor/file-editor";
import { ImageViewer } from "@/components/viewer/image-viewer";
import { MissingIndexPrompt } from "@/components/viewer/missing-index-prompt";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const segments = path ?? [];
  const routePath = segments.join("/");
  const kind = routePath ? classifyFile(routePath) : "markdown";

  if (kind === "image") {
    return <ImageViewer key={routePath} path={routePath} />;
  }

  if (kind === "text") {
    const content = await readTextFile(routePath).catch(() => null);
    if (content === null) {
      notFound();
    }
    return <FileEditor key={routePath} path={routePath} content={content} />;
  }

  const document = await resolveRouteDocument(segments).catch(() => null);
  if (!document) {
    if (await folderExists(routePath)) {
      return <MissingIndexPrompt key={routePath} folderPath={routePath} />;
    }
    notFound();
  }

  const docPaths = await listDocumentPaths();

  return <DocumentEditor key={document.path} document={document} docPaths={docPaths} />;
}
