import { useState }       from "react";
import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface KanbanColumn {
  id:     string;
  label:  string;
  color?: string;
}

export interface KanbanItem {
  id:       string;
  columnId: string;
  [key: string]: unknown;
}

export interface KanbanBoardProps<T extends KanbanItem> {
  columns:      KanbanColumn[];
  items:        T[];
  onDragEnd:    (itemId: string, newColumnId: string) => void;
  renderCard:   (item: T) => ReactNode;
  className?:   string;
}

export function KanbanBoard<T extends KanbanItem>({
  columns, items, onDragEnd, renderCard, className
}: KanbanBoardProps<T>) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overCol,   setOverCol]   = useState<string | null>(null);

  function getColumnItems(columnId: string): T[] {
    return items.filter(item => item.columnId === columnId);
  }

  return (
    <div
      data-testid="kanban-board"
      className={cn("flex gap-4 overflow-x-auto pb-4", className)}
    >
      {columns.map((col) => (
        <div
          key={col.id}
          data-testid={`kanban-column-${col.id}`}
          className={cn(
            "flex-shrink-0 w-64 rounded-lg bg-gray-50 border border-gray-200",
            overCol === col.id && "border-indigo-300 bg-indigo-50"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setOverCol(col.id);
          }}
          onDragLeave={() => setOverCol(null)}
          onDrop={() => {
            if (draggedId) {
              onDragEnd(draggedId, col.id);
              setDraggedId(null);
              setOverCol(null);
            }
          }}
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {col.label}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              {getColumnItems(col.id).length}
            </span>
          </div>

          {/* Cards */}
          <div className="p-2 space-y-2 min-h-16">
            {getColumnItems(col.id).map((item) => (
              <div
                key={item.id}
                data-testid={`kanban-card-${item.id}`}
                draggable
                onDragStart={() => setDraggedId(item.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setOverCol(null);
                }}
                className={cn(
                  "cursor-grab active:cursor-grabbing",
                  draggedId === item.id && "opacity-50"
                )}
              >
                {renderCard(item)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}