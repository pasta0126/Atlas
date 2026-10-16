"use client";

import CodeMirror from "@uiw/react-codemirror";
import { EditorView, scrollPastEnd } from "@codemirror/view";
import { useEffect, useState } from "react";

// `scrollPastEnd`: ver markdown-editor.tsx.
const extensions = [EditorView.lineWrapping, scrollPastEnd()];

export function PlainTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // Arranca en "light" para que coincida con el render del servidor (que no
  // conoce la preferencia de color del navegador) y se ajusta tras montar,
  // evitando un mismatch de hidratación.
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange(event: MediaQueryListEvent | MediaQueryList) {
      setTheme(event.matches ? "dark" : "light");
    }
    queueMicrotask(() => handleChange(query));
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={theme}
      height="100%"
      className="h-full overflow-y-auto text-sm"
      basicSetup={{ foldGutter: false }}
    />
  );
}
