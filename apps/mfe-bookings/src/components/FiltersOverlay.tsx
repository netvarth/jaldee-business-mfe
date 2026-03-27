import { Button, RadioGroup } from "@jaldee/design-system";
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
        <Button type="button" variant="ghost" size="md" className="overlay-close" onClick={onClose} aria-label="Close filters">
          ×
        </Button>
      </div>

      <RadioGroup
        name="savedFilter"
        value={activeFilter}
        onChange={(value) => onFilterSelect?.(value)}
        className="filter-list"
        optionClassName="filter-list-option"
        indicatorClassName="filter-list-indicator"
        labelClassName="filter-list-label"
        options={savedFilters.map((filter) => ({
          value: filter.name,
          label: <strong>{filter.name}</strong>,
          description: filter.meta ? <p>{filter.meta}</p> : undefined,
          className: activeFilter === filter.name ? "active" : undefined,
        }))}
      />

      <div className="overlay-actions">
        <Button type="button" variant="outline" className="ghost">
          Create Filter
        </Button>
        <Button type="button" variant="primary" className="solid">
          Manage
        </Button>
      </div>
    </div>
  );
}
