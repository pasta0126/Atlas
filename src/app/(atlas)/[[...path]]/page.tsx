import { notFound } from "next/navigation";
import { listDocumentPaths, resolveRouteDocument } from "@/lib/fs";
import { DocumentEditor } from "@/components/editor/document-editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;

  const document = await resolveRouteDocument(path ?? []).catch(() => null);
  if (!document) {
    notFound();
  }

  const docPaths = await listDocumentPaths();

  return <DocumentEditor key={document.path} document={document} docPaths={docPaths} />;
}
