"use client";

import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { useEffect, useState } from "react";

const extensions = [markdown({ codeLanguages: languages }), EditorView.lineWrapping];

export function MarkdownEditor({
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
    // Deferido a un microtask: el valor inicial del servidor ("light") debe
    // llegar a pintarse tal cual antes de ajustarlo al del navegador, para no
    // provocar un mismatch de hidratación.
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
