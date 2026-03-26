import './FiltersOverlay.css';

export default function FiltersOverlay({ savedFilters = [], onClose, activeFilter, onFilterSelect }) {
  return (
    <div className="filters-overlay">
      <div className="overlay-header">
        <strong>Filters</strong>
        <button onClick={onClose} aria-label="Close filters">✕</button>
      </div>
      <div className="filter-list">
        {savedFilters.map((filter) => (
          <label key={filter.name} className={activeFilter === filter.name ? 'active' : ''}>
            <input
              type="radio"
              name="savedFilter"
              checked={activeFilter === filter.name}
              onChange={() => onFilterSelect(filter.name)}
            />
            <div>
              <strong>{filter.name}</strong>
              <p>{filter.meta}</p>
            </div>
          </label>
        ))}
      </div>
      <div className="overlay-actions">
        <button className="ghost">Create Filter</button>
        <button className="solid">Manage</button>
      </div>
    </div>
  );
}
