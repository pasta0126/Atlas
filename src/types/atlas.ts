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
  [key: string]: unknown;
}

export interface AtlasDocument {
  path: string;
  frontmatter: Frontmatter;
  content: string;
  backlinks: string[];
}
