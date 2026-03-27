import { Button, Checkbox } from "@jaldee/design-system";
import "./SidebarFilters.css";

type FilterItem = {
  label: string;
  checked?: boolean;
  color?: string;
};

type FilterSection = {
  title: string;
  items: FilterItem[];
};

type SidebarFiltersProps = {
  filters: FilterSection[];
  onToggle?: (sectionTitle: string, itemLabel: string, checked: boolean) => void;
};

export default function SidebarFilters({ filters, onToggle }: SidebarFiltersProps) {
  return (
    <aside className="sidebar-filters">
      {filters.map((section) => (
        <div key={section.title} className="filter-section">
          <header>
            <strong>{section.title}</strong>
            <Button type="button" variant="ghost" size="md" aria-label="Expand">+</Button>
          </header>

          <div className="section-items">
            {section.items.map((item) => (
              <Checkbox
                key={item.label}
                checked={Boolean(item.checked)}
                onChange={(event) => onToggle?.(section.title, item.label, event.target.checked)}
                containerClassName={`sidebar-filter-item ${item.checked ? "checked" : ""}`}
                controlClassName="sidebar-filter-control"
                labelClassName="sidebar-filter-label"
                label={
                  <>
                    <span
                      className="filter-dot"
                      aria-hidden="true"
                      style={{ "--dot-color": item.color || "#c9c9d1" } as React.CSSProperties}
                    />
                    <span className="filter-label">{item.label}</span>
                  </>
                }
              />
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
