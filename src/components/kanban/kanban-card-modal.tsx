"use client";

import { useState } from "react";
import type { KanbanCard } from "@/types/kanban";

const fieldClassName =
  "w-full rounded border border-border bg-transparent px-2 py-1 text-sm outline-none";
const labelClassName = "mb-1 block text-xs text-zinc-500 dark:text-zinc-400";

export function KanbanCardModal({
  card,
  onSave,
  onDelete,
  onClose,
}: {
  card: KanbanCard;
  onSave: (card: KanbanCard) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [dueDate, setDueDate] = useState(card.dueDate ?? "");
  const [tagsInput, setTagsInput] = useState(card.tags.join(", "));

  function handleSave() {
    if (title.trim() === "") return;
    onSave({
      ...card,
      title: title.trim(),
      description,
      dueDate: dueDate || undefined,
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <label className="mb-3 block">
          <span className={labelClassName}>Título</span>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="mb-3 block">
          <span className={labelClassName}>Descripción</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className={`${fieldClassName} resize-none`}
          />
        </label>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClassName}>Creada</span>
            <input type="date" value={card.createdAt} disabled className={`${fieldClassName} opacity-60`} />
          </label>
          <label className="block">
            <span className={labelClassName}>Vencimiento</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={fieldClassName}
            />
          </label>
        </div>
        <label className="mb-4 block">
          <span className={labelClassName}>Etiquetas</span>
          <input
            type="text"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="separadas, por, comas"
            className={fieldClassName}
          />
        </label>
        <div className="flex items-center justify-between">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Eliminar tarjeta
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1 text-sm text-zinc-600 hover:bg-surface-hover dark:text-zinc-400"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-foreground px-3 py-1 text-sm text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
