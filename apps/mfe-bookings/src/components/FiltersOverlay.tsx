import "./FiltersOverlay.css";

export type SavedFilter = {
  name: string;
  meta?: string;
};

export interface FiltersOverlayProps {
  savedFilters?: SavedFilter[];
  onClose?: () => void;
  activeFilter?: string;
  onFilterSelect?: (filterName: string) => void;
}

export default function FiltersOverlay({
  savedFilters = [],
  onClose,
  activeFilter,
  onFilterSelect,
}: FiltersOverlayProps): JSX.Element {
  return (
    <div className="filters-overlay">
      <div className="overlay-header">
        <strong>Filters</strong>
        <button type="button" onClick={onClose} aria-label="Close filters">
          ✕
        </button>
      </div>

      <div className="filter-list">
        {savedFilters.map((filter) => (
          <label
            key={filter.name}
            className={activeFilter === filter.name ? "active" : ""}
          >
            <input
              type="radio"
              name="savedFilter"
              checked={activeFilter === filter.name}
              onChange={() => onFilterSelect?.(filter.name)}
            />
            <div>
              <strong>{filter.name}</strong>
              <p>{filter.meta}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="overlay-actions">
        <button type="button" className="ghost">
          Create Filter
        </button>
        <button type="button" className="solid">
          Manage
        </button>
      </div>
    </div>
  );
}