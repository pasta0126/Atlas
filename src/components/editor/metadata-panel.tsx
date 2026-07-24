"use client";

import { useState } from "react";
import type { Frontmatter } from "@/types/atlas";

function toDateInputValue(fecha: unknown): string {
  if (!fecha) return "";
  const date = new Date(fecha as string);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

const fieldClassName =
  "rounded border border-black/[.08] bg-transparent px-2 py-1 text-sm outline-none dark:border-white/[.145]";
const labelClassName = "text-xs text-zinc-500 dark:text-zinc-400";

export function MetadataPanel({
  frontmatter,
  onChange,
}: {
  frontmatter: Frontmatter;
  onChange: (next: Frontmatter) => void;
}) {
  const [etiquetasInput, setEtiquetasInput] = useState((frontmatter.etiquetas ?? []).join(", "));
  const [relacionadosInput, setRelacionadosInput] = useState(
    (frontmatter.relacionados ?? []).join(", "),
  );

  function commitEtiquetas() {
    const parsed = parseList(etiquetasInput);
    setEtiquetasInput(parsed.join(", "));
    onChange({ ...frontmatter, etiquetas: parsed });
  }

  function commitRelacionados() {
    const parsed = parseList(relacionadosInput);
    setRelacionadosInput(parsed.join(", "));
    onChange({ ...frontmatter, relacionados: parsed });
  }

  return (
    <div className="grid grid-cols-2 gap-3 border-b border-black/[.08] px-4 py-3 dark:border-white/[.145] sm:grid-cols-4">
      <label className="flex flex-col gap-1">
        <span className={labelClassName}>Título</span>
        <input
          type="text"
          value={frontmatter.titulo ?? ""}
          onChange={(event) => onChange({ ...frontmatter, titulo: event.target.value })}
          className={fieldClassName}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClassName}>Fecha</span>
        <input
          type="date"
          value={toDateInputValue(frontmatter.fecha)}
          onChange={(event) => onChange({ ...frontmatter, fecha: event.target.value })}
          className={fieldClassName}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClassName}>Etiquetas</span>
        <input
          type="text"
          value={etiquetasInput}
          onChange={(event) => setEtiquetasInput(event.target.value)}
          onBlur={commitEtiquetas}
          placeholder="separadas, por, comas"
          className={fieldClassName}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClassName}>Relacionados</span>
        <input
          type="text"
          value={relacionadosInput}
          onChange={(event) => setRelacionadosInput(event.target.value)}
          onBlur={commitRelacionados}
          placeholder="rutas separadas por comas"
          className={fieldClassName}
        />
      </label>
    </div>
  );
}
