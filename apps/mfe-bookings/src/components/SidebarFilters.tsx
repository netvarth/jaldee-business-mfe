import './SidebarFilters.css';

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
            <button aria-label="Expand">+</button>
          </header>

          <div className="section-items">
            {section.items.map((item) => (
              <label
                key={item.label}
                className={item.checked ? 'checked' : ''}
                style={
                  {
                    '--dot-color': item.color || '#c9c9d1',
                  } as React.CSSProperties
                }
              >
                <input
                  type="checkbox"
                  checked={Boolean(item.checked)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onToggle?.(section.title, item.label, event.target.checked)
                  }
                />
                <span className="filter-dot" aria-hidden="true" />
                <span className="filter-label">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}