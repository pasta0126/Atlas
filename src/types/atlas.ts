export type NodeType = "folder" | "document" | "file";

export interface AtlasNode {
  path: string;
  type: NodeType;
  title: string;
  children?: AtlasNode[];
}

export interface Frontmatter {
  titulo?: string;
  fecha?: string;
  etiquetas?: string[];
  relacionados?: string[];
  /** Si es `true`, `AtlasDocument.content` es un sobre cifrado (ver `lib/crypto.ts`), no markdown en claro. */
  cifrado?: boolean;
  [key: string]: unknown;
}

export interface AtlasDocument {
  path: string;
  frontmatter: Frontmatter;
  content: string;
  backlinks: string[];
}
