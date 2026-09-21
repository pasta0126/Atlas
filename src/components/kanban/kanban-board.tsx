"use client";

import { useState } from "react";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CircleIcon,
  InboxIcon,
  KanbanIcon,
  LockIcon,
  MoreHorizontalIcon,
  PlusIcon,
  XIcon,
} from "@/components/icons";
import { KanbanCardModal } from "./kanban-card-modal";
import type {
  KanbanBoard as KanbanBoardData,
  KanbanCard,
  KanbanColumn,
} from "@/types/kanban";

type IconComponent = (props: { className?: string }) => React.JSX.Element;

const DRAG_MIME_TYPE = "application/x-atlas-kanban-card";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function newCard(): KanbanCard {
  return {
    id: Math.random().toString(36).slice(2, 10),
    title: "",
    description: "",
    createdAt: todayIso(),
    tags: [],
  };
}

function apiPathFor(folderPath: string): string {
  return `/api/kanban/${folderPath.split("/").map(encodeURIComponent).join("/")}`;
}

function isOverdue(card: KanbanCard): boolean {
  if (!card.dueDate) return false;
  return card.dueDate < todayIso();
}

const PURGEABLE_COLUMN_NAMES = new Set(["hecho", "descartados"]);

function isPurgeableColumn(name: string): boolean {
  return PURGEABLE_COLUMN_NAMES.has(name.trim().toLowerCase());
}

const DEFAULT_COLLAPSED_COLUMN_NAMES = new Set(["backlog", "descartados"]);

function defaultCollapsedIds(board: KanbanBoardData): Set<string> {
  return new Set(
    board.columns
      .filter((column) => DEFAULT_COLLAPSED_COLUMN_NAMES.has(column.name.trim().toLowerCase()))
      .map((column) => column.id),
  );
}

const COLUMN_ICONS: Record<string, IconComponent> = {
  backlog: InboxIcon,
  "por hacer": CircleIcon,
  "en progreso": ClockIcon,
  bloqueado: LockIcon,
  hecho: CheckIcon,
  descartados: XIcon,
};

function columnIcon(name: string): IconComponent | undefined {
  return COLUMN_ICONS[name.trim().toLowerCase()];
}

// Hash determinístico simple (FNV-1a) para asignar siempre el mismo color a
// una misma etiqueta, y así poder agrupar tarjetas visualmente por tag.
const TAG_HUE_COUNT = 8;

function tagHueClass(tag: string): string {
  let hash = 0x811c9dc5;
  const normalized = tag.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hue = (hash >>> 0) % TAG_HUE_COUNT;
  return `tag-hue-${hue + 1}`;
}

export function KanbanBoard({
  folderPath,
  initialBoard,
}: {
  folderPath: string;
  initialBoard: KanbanBoardData;
}) {
  const [board, setBoard] = useState(initialBoard);
  const [editing, setEditing] = useState<{
    columnId: string;
    card: KanbanCard;
    isNew: boolean;
  } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() =>
    defaultCollapsedIds(initialBoard),
  );

  function toggleCollapse(columnId: string) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  }

  async function persist(next: KanbanBoardData) {
    const previous = board;
    setBoard(next);
    try {
      const response = await fetch(apiPathFor(folderPath), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: next }),
      });
      setSaveError(!response.ok);
      if (!response.ok) setBoard(previous);
    } catch {
      setSaveError(true);
      setBoard(previous);
    }
  }

  function addColumn() {
    const name = window.prompt("Nombre de la nueva columna");
    if (!name || name.trim() === "") return;
    const column: KanbanColumn = {
      id: Math.random().toString(36).slice(2, 10),
      name: name.trim(),
      cards: [],
    };
    persist({ columns: [...board.columns, column] });
  }

  function renameColumn(columnId: string) {
    const column = board.columns.find((c) => c.id === columnId);
    if (!column) return;
    const name = window.prompt("Nuevo nombre de columna", column.name);
    if (!name || name.trim() === "" || name === column.name) return;
    persist({
      columns: board.columns.map((c) =>
        c.id === columnId ? { ...c, name: name.trim() } : c,
      ),
    });
  }

  function deleteColumn(columnId: string) {
    const column = board.columns.find((c) => c.id === columnId);
    if (!column) return;
    if (
      column.cards.length > 0 &&
      !window.confirm(`"${column.name}" tiene tarjetas. ¿Eliminarla igualmente?`)
    ) {
      return;
    }
    persist({ columns: board.columns.filter((c) => c.id !== columnId) });
  }

  function purgeColumn(columnId: string) {
    const column = board.columns.find((c) => c.id === columnId);
    if (!column || column.cards.length === 0) return;
    if (
      !window.confirm(
        `¿Vaciar "${column.name}"? Se eliminarán sus ${column.cards.length} tarjeta(s).`,
      )
    )
      return;
    persist({
      columns: board.columns.map((c) => (c.id === columnId ? { ...c, cards: [] } : c)),
    });
  }

  function openNewCard(columnId: string) {
    setEditing({ columnId, card: newCard(), isNew: true });
  }

  function openEditCard(columnId: string, card: KanbanCard) {
    setEditing({ columnId, card, isNew: false });
  }

  function saveCard(nextCard: KanbanCard) {
    if (!editing) return;
    const { columnId, isNew } = editing;
    persist({
      columns: board.columns.map((column) => {
        if (column.id !== columnId) return column;
        if (isNew) return { ...column, cards: [...column.cards, nextCard] };
        return {
          ...column,
          cards: column.cards.map((c) => (c.id === nextCard.id ? nextCard : c)),
        };
      }),
    });
    setEditing(null);
  }

  function deleteCard() {
    if (!editing) return;
    const { columnId, card } = editing;
    persist({
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cards: column.cards.filter((c) => c.id !== card.id) }
          : column,
      ),
    });
    setEditing(null);
  }

  function handleCardDragStart(event: React.DragEvent, columnId: string, cardId: string) {
    event.dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify({ columnId, cardId }));
    event.dataTransfer.effectAllowed = "move";
  }

  function isValidDrag(event: React.DragEvent): boolean {
    return event.dataTransfer.types.includes(DRAG_MIME_TYPE);
  }

  function moveCard(
    fromColumnId: string,
    cardId: string,
    toColumnId: string,
    beforeCardId: string | null,
  ) {
    if (fromColumnId === toColumnId && beforeCardId === cardId) return;

    let moved: KanbanCard | undefined;
    const withoutCard = board.columns.map((column) => {
      if (column.id !== fromColumnId) return column;
      const card = column.cards.find((c) => c.id === cardId);
      moved = card;
      return { ...column, cards: column.cards.filter((c) => c.id !== cardId) };
    });
    if (!moved) return;

    const next = withoutCard.map((column) => {
      if (column.id !== toColumnId) return column;
      const cards = [...column.cards];
      const insertAt = beforeCardId ? cards.findIndex((c) => c.id === beforeCardId) : -1;
      if (insertAt === -1) cards.push(moved!);
      else cards.splice(insertAt, 0, moved!);
      return { ...column, cards };
    });

    persist({ columns: next });
  }

  function handleDropOnColumn(event: React.DragEvent, columnId: string) {
    if (!isValidDrag(event)) return;
    event.preventDefault();
    setDragOverColumn(null);
    const data = event.dataTransfer.getData(DRAG_MIME_TYPE);
    if (!data) return;
    const { columnId: fromColumnId, cardId } = JSON.parse(data) as {
      columnId: string;
      cardId: string;
    };
    moveCard(fromColumnId, cardId, columnId, null);
  }

  function handleDropOnCard(
    event: React.DragEvent,
    columnId: string,
    beforeCardId: string,
  ) {
    if (!isValidDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOverColumn(null);
    const data = event.dataTransfer.getData(DRAG_MIME_TYPE);
    if (!data) return;
    const { columnId: fromColumnId, cardId } = JSON.parse(data) as {
      columnId: string;
      cardId: string;
    };
    moveCard(fromColumnId, cardId, columnId, beforeCardId);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h1 className="flex items-center gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          <KanbanIcon className="h-4 w-4" /> {folderPath}
        </h1>
        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              Error al guardar
            </span>
          )}
          <button
            type="button"
            onClick={addColumn}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-600 hover:bg-surface-hover dark:text-zinc-400"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Columna
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-auto p-4">
        {board.columns.map((column) => {
          const Icon = columnIcon(column.name);
          const isCollapsed = collapsedColumns.has(column.id);

          if (isCollapsed) {
            return (
              <div
                key={column.id}
                onDragOver={(event) => {
                  if (!isValidDrag(event)) return;
                  event.preventDefault();
                  setDragOverColumn(column.id);
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(event) => handleDropOnColumn(event, column.id)}
                className={`flex w-9 shrink-0 flex-col items-center gap-2 rounded-lg border border-border bg-surface py-2 ${
                  dragOverColumn === column.id
                    ? "ring-1 ring-inset ring-blue-400 dark:ring-blue-500"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleCollapse(column.id)}
                  title="Expandir columna"
                  className="rounded p-0.5 text-zinc-400 hover:bg-surface-hover hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
                {Icon && (
                  <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                )}
                <span className="flex-1 [writing-mode:vertical-rl] text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  {column.name} ({column.cards.length})
                </span>
              </div>
            );
          }

          return (
            <div
              key={column.id}
              onDragOver={(event) => {
                if (!isValidDrag(event)) return;
                event.preventDefault();
                setDragOverColumn(column.id);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(event) => handleDropOnColumn(event, column.id)}
              className={`flex w-64 shrink-0 flex-col rounded-lg border border-border bg-surface ${
                dragOverColumn === column.id
                  ? "ring-1 ring-inset ring-blue-400 dark:ring-blue-500"
                  : ""
              }`}
            >
              <div className="group flex items-center justify-between gap-1 px-2 py-2">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{column.name}</span>
                  <span className="shrink-0 font-normal normal-case">
                    ({column.cards.length})
                  </span>
                </span>
                <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(column.id)}
                    title="Colapsar columna"
                    className="rounded p-0.5 text-zinc-400 hover:bg-surface-hover hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <details className="relative [&[open]]:opacity-100">
                    <summary className="flex cursor-pointer list-none items-center rounded px-1 py-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </summary>
                    <div
                      className="absolute right-0 z-10 mt-1 flex flex-col gap-0.5 rounded border border-border bg-surface p-1 text-xs shadow-lg"
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("button")) {
                          (
                            event.currentTarget.closest(
                              "details",
                            ) as HTMLDetailsElement | null
                          )?.removeAttribute("open");
                        }
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => renameColumn(column.id)}
                        className="whitespace-nowrap rounded px-2 py-1 text-left text-zinc-700 hover:bg-surface-hover dark:text-zinc-300"
                      >
                        Renombrar
                      </button>
                      {isPurgeableColumn(column.name) && (
                        <button
                          type="button"
                          onClick={() => purgeColumn(column.id)}
                          disabled={column.cards.length === 0}
                          className="whitespace-nowrap rounded px-2 py-1 text-left text-zinc-700 hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300"
                        >
                          Purgar tarjetas
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteColumn(column.id)}
                        className="whitespace-nowrap rounded px-2 py-1 text-left text-red-600 hover:bg-surface-hover dark:text-red-400"
                      >
                        Eliminar
                      </button>
                    </div>
                  </details>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                {column.cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(event) =>
                      handleCardDragStart(event, column.id, card.id)
                    }
                    onDragOver={(event) => {
                      if (!isValidDrag(event)) return;
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={(event) => handleDropOnCard(event, column.id, card.id)}
                    onClick={() => openEditCard(column.id, card)}
                    className="cursor-pointer rounded border border-border bg-background p-2 text-left shadow-sm hover:shadow"
                  >
                    <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                      {card.title}
                    </p>
                    {(card.dueDate || card.tags.length > 0) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {card.dueDate && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              isOverdue(card)
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                : "bg-surface-hover text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            {card.dueDate}
                          </span>
                        )}
                        {card.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded px-1.5 py-0.5 text-[10px] ${tagHueClass(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => openNewCard(column.id)}
                className="mx-2 mb-2 flex items-center justify-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-surface-hover dark:text-zinc-400"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Tarjeta
              </button>
            </div>
          );
        })}
        {board.columns.length === 0 && (
          <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
            Sin columnas todavía. Usa &ldquo;+ Columna&rdquo; para empezar.
          </p>
        )}
      </div>
      {editing && (
        <KanbanCardModal
          card={editing.card}
          onSave={saveCard}
          onDelete={editing.isNew ? undefined : deleteCard}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
