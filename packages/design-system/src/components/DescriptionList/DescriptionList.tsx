import { cn } from "../../utils";

export interface DescriptionItem {
  label: string;
  value: React.ReactNode;
}

export interface DescriptionListProps {
  items:      DescriptionItem[];
  columns?:   1 | 2 | 3;
  className?: string;
}

const colMap = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

export function DescriptionList({ items, columns = 2, className }: DescriptionListProps) {
  return (
    <dl
      data-testid="description-list"
      className={cn("grid gap-4", colMap[columns], className)}
    >
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <dt className="text-[length:var(--text-xs)] font-medium text-gray-500">{item.label}</dt>
          <dd className="m-0 text-[length:var(--text-sm)] font-medium text-gray-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
