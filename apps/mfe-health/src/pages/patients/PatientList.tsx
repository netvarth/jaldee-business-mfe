import { useState, useMemo }                from "react";
import { useNavigate }                      from "react-router-dom";
import {
  PageHeader,
  Button,
  Badge,
  DataTable,
  EmptyState,
  ComponentErrorBoundary,
} from "@jaldee/design-system";
import type { ColumnDef }                   from "@jaldee/design-system";
import { mockPatients }                     from "../../mocks/patients";
import type { Patient }                     from "../../mocks/patients";

// ─── Column definitions ───────────────────────────────

function getColumns(
  onView: (patient: Patient) => void
): ColumnDef<Record<string, unknown>>[] {
  return [
    {
      key:    "patientId",
      header: "Patient ID",
      render: (row) => (
        <span className="text-[var(--color-text-secondary)] font-medium text-[var(--text-sm)]">
          {row.patientId as string}
        </span>
      ),
    },
    {
      key:    "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center text-[var(--text-sm)] font-bold flex-shrink-0">
            {(row.name as string).charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-[var(--color-text-primary)] text-[var(--text-sm)]">
              {row.name as string}
            </div>
            <div className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
              {row.email as string}
            </div>
          </div>
        </div>
      ),
    },
    {
      key:    "phone",
      header: "Phone",
      render: (row) => (
        <span className="text-[var(--text-sm)] text-[var(--color-text-primary)]">
          {row.phone as string}
        </span>
      ),
    },
    {
      key:    "bloodGroup",
      header: "Blood Group",
      render: (row) => (
        <span className="bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-semibold">
          {row.bloodGroup as string}
        </span>
      ),
    },
    {
      key:      "doctor",
      header:   "Doctor",
      sortable: true,
      render:   (row) => (
        <span className="text-[var(--text-sm)] text-[var(--color-text-primary)]">
          {row.doctor as string}
        </span>
      ),
    },
    {
      key:    "lastVisit",
      header: "Last Visit",
      sortable: true,
      render: (row) => (
        <span className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          {new Date(row.lastVisit as string).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
      ),
    },
    {
      key:    "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "active" ? "success" : "neutral"} dot>
          {row.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key:    "actions",
      header: "",
      sticky: "right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          data-testid={`patient-row-action-${row.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onView(row as unknown as Patient);
          }}
        >
          View
        </Button>
      ),
    },
  ];
}

// ─── Patient List Page ────────────────────────────────

export default function PatientList() {
  const navigate            = useNavigate();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const pageSize            = 8;

  // Client-side filter
  const filtered = useMemo(() => {
    if (!search.trim()) return mockPatients;
    const q = search.toLowerCase();
    return mockPatients.filter(p =>
      p.name.toLowerCase().includes(q)      ||
      p.patientId.toLowerCase().includes(q) ||
      p.doctor.toLowerCase().includes(q)    ||
      p.phone.includes(q)
    );
  }, [search]);

  // Paginate
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

  function handleView(patient: Patient) {
    navigate(`/health/patients/${patient.id}`);
  }

  const columns = getColumns(handleView);

  return (
    <div
      data-testid="patient-list-page"
      className="w-full"
    >
      <PageHeader
        title="Patients"
        actions={
          <Button
            data-testid="patient-list-new-btn"
            variant="primary"
            icon="+"
            onClick={() => navigate("/health/patients/new")}
          >
            New Patient
          </Button>
        }
        onNavigate={navigate}
      />

      <ComponentErrorBoundary label="Patient list">
        <DataTable
          data-testid="patient-list-table"
          data={paginated as unknown as Record<string, unknown>[]}
          columns={columns}
          searchable
          searchPlaceholder="Search patients..."
          onSearch={handleSearch}
          onRowClick={(row) => handleView(row as unknown as Patient)}
          emptyState={
            <EmptyState
              icon="👤"
              title="No patients found"
              description="Try adjusting your search or register a new patient."
              action={
                <Button
                  variant="primary"
                  onClick={() => navigate("/health/patients/new")}
                >
                  New Patient
                </Button>
              }
            />
          }
          pagination={{
            pageSize,
            total:    filtered.length,
            page,
            onChange: setPage,
          }}
        />
      </ComponentErrorBoundary>
    </div>
  );
}
