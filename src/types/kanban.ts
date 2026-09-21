export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  dueDate?: string;
  tags: string[];
}

export interface KanbanColumn {
  id: string;
  name: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  columns: KanbanColumn[];
}
