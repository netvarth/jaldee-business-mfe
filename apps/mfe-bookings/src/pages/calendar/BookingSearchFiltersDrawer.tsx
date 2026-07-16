import { Button } from "@jaldee/design-system";
import { SchemaFilterBuilder } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useModal } from "../../contexts/ModalContext";

interface BookingSearchFiltersDrawerProps {
  schema: SearchSchema | null;
  draftFilters: SearchFilterClause[];
  appliedCount: number;
  appliedSummary?: string;
  onChange: (filters: SearchFilterClause[]) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function BookingSearchFiltersDrawer({
  schema,
  draftFilters,
  appliedCount,
  appliedSummary,
  onChange,
  onApply,
  onReset,
}: BookingSearchFiltersDrawerProps) {
  const { closeDrawer } = useModal();

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <p className="text-sm text-slate-500">Apply filters to refine your bookings.</p>
        </div>
        <button
          type="button"
          aria-label="Close filters"
          onClick={closeDrawer}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <SchemaFilterBuilder
          schema={schema}
          value={draftFilters}
          onChange={onChange}
          appliedCount={appliedCount}
          appliedSummary={appliedSummary}
          onClearAll={onReset}
          emptyStateMessage="No booking filters are available from the schema."
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
        <Button type="button" variant="outline" onClick={onReset}>
          Reset All
        </Button>
        <Button
          type="button"
          onClick={() => {
            onApply();
            closeDrawer();
          }}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
