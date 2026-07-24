import matter from "gray-matter";
import type { Frontmatter } from "@/types/atlas";

export function parseFrontmatter(raw: string): {
  frontmatter: Frontmatter;
  content: string;
} {
  const { data, content } = matter(raw);
  return { frontmatter: data as Frontmatter, content: content.replace(/^\n+/, "") };
}

export function serializeFrontmatter(frontmatter: Frontmatter, content: string): string {
  const body = content.trimEnd();
  return matter.stringify(body.length > 0 ? `${body}\n` : "", frontmatter);
}

export function documentTemplate(titulo: string): string {
  const fecha = new Date().toISOString().slice(0, 10);
  return serializeFrontmatter({ titulo, fecha }, `# ${titulo}\n`);
}
