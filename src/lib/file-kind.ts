const IMAGE_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
};

const TEXT_EXTENSIONS = new Set([
  "yml",
  "yaml",
  "json",
  "txt",
  "csv",
  "tsv",
  "log",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "py",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "css",
  "scss",
  "less",
  "html",
  "htm",
  "xml",
  "toml",
  "ini",
  "conf",
  "cfg",
  "env",
  "sql",
  "graphql",
  "gql",
  "gitignore",
  "dockerignore",
  "editorconfig",
]);

export type FileKind = "markdown" | "text" | "image" | "unsupported";

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx <= 0) return name.startsWith(".") ? name.slice(1).toLowerCase() : "";
  return name.slice(idx + 1).toLowerCase();
}

export function classifyFile(name: string): FileKind {
  const ext = extensionOf(name);
  if (ext === "md") return "markdown";
  if (ext in IMAGE_MIME_TYPES) return "image";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "unsupported";
}

export function imageMimeType(name: string): string | undefined {
  return IMAGE_MIME_TYPES[extensionOf(name)];
}
