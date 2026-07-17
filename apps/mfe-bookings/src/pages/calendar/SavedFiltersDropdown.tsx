import { Button, Popover, PopoverSection } from "@jaldee/design-system";
import type { FilterEntity } from "../../services/useDashboardFilters";

interface SavedFiltersDropdownProps {
  filters: FilterEntity[];
  activeFilterUid?: string;
  onSelect: (filter: FilterEntity | null) => void;
  onDelete: (uid: string) => void;
}

export default function SavedFiltersDropdown({
  filters,
  activeFilterUid,
  onSelect,
  onDelete,
}: SavedFiltersDropdownProps) {
  return (
    <Popover
      align="end"
      contentClassName="!w-[280px] !p-2"
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2 rounded-md px-4 py-2 font-semibold"
          id="saved-filters-toggle"
          title="Saved Filters"
        >
          <BookmarkIcon />
          <span>Saved</span>
          {activeFilterUid && (
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 ml-1" />
          )}
        </Button>
      }
    >
      <div className="flex flex-col gap-1 p-1">
        <h3 className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          Saved Filters
        </h3>
        
        {filters.length === 0 ? (
          <div className="px-2 py-3 text-sm text-slate-500">No saved filters.</div>
        ) : (
          <PopoverSection>
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                !activeFilterUid ? "bg-slate-50 font-semibold text-indigo-700" : "text-slate-700"
              }`}
              onClick={() => onSelect(null)}
            >
              <span>Default (None)</span>
            </button>
            {filters.map((filter) => {
              const isActive = filter.uid === activeFilterUid;
              return (
                <div
                  key={filter.uid}
                  className={`group flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-slate-50 ${
                    isActive ? "bg-slate-50 font-semibold text-indigo-700" : "text-slate-700"
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left text-sm"
                    onClick={() => onSelect(filter)}
                  >
                    {filter.name}
                  </button>
                  {filter.uid && (
                    <button
                      type="button"
                      className="ml-2 hidden shrink-0 text-slate-400 hover:text-red-600 group-hover:block"
                      title="Delete Filter"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete filter "${filter.name}"?`)) {
                          onDelete(filter.uid!);
                        }
                      }}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              );
            })}
          </PopoverSection>
        )}
      </div>
    </Popover>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
