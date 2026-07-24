import { readTree } from "@/lib/fs";
import { AtlasShell } from "@/components/shell/atlas-shell";

export default async function AtlasLayout({ children }: { children: React.ReactNode }) {
  const tree = await readTree();

  return <AtlasShell tree={tree}>{children}</AtlasShell>;
}
