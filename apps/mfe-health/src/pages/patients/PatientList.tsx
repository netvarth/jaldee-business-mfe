import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  Button,
  Badge,
  DataTable,
  DataTableToolbar,
  EmptyState,
  ComponentErrorBoundary,
  Popover,
  PopoverSection,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { mockPatients } from "../../mocks/patients";
import type { Patient } from "../../mocks/patients";

function getColumns(
  onView: (patient: Patient) => void
): ColumnDef<Patient>[] {
  return [
    {
      key: "patientId",
      header: "Patient ID",
      sortable: true,
      render: (row) => (
        <span className="text-[var(--color-text-secondary)] font-medium text-[var(--text-sm)]">
          {row.patientId}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center text-[var(--text-sm)] font-bold flex-shrink-0">
            {row.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-[var(--color-text-primary)] text-[var(--text-sm)]">
              {row.name}
            </div>
            <div className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
              {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => (
        <span className="text-[var(--text-sm)] text-[var(--color-text-primary)]">
          {row.phone}
        </span>
      ),
    },
    {
      key: "bloodGroup",
      header: "Blood Group",
      render: (row) => (
        <span className="bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-semibold">
          {row.bloodGroup}
        </span>
      ),
    },
    {
      key: "doctor",
      header: "Doctor",
      sortable: true,
      render: (row) => (
        <span className="text-[var(--text-sm)] text-[var(--color-text-primary)]">
          {row.doctor}
        </span>
      ),
    },
    {
      key: "lastVisit",
      header: "Last Visit",
      sortable: true,
      sortFn: (a, b) =>
        new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime(),
      render: (row) => (
        <span className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          {new Date(row.lastVisit).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === "active" ? "success" : "neutral"} dot>
          {row.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      sticky: "right",
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Popover
            data-testid={`patient-row-action-${row.id}`}
            align="end"
            contentClassName="min-w-[240px] p-2"
            trigger={
              <button
                type="button"
                aria-label={`More actions for ${row.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]"
              >
                <MoreIcon />
              </button>
            }
          >
            <PopoverSection>
              <button
                type="button"
                data-testid={`patient-row-action-view-${row.id}`}
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)]"
                onClick={(event) => {
                  event.stopPropagation();
                  onView(row);
                }}
              >
                View Patient
              </button>
            </PopoverSection>
          </Popover>
        </div>
      ),
    },
  ];
}

export default function PatientList() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const pageSize = 8;

  function handleView(patient: Patient) {
    navigate(`/health/patients/${patient.id}`);
  }

  const columns = useMemo(() => getColumns(handleView), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return mockPatients;

    const q = search.toLowerCase();

    return mockPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.doctor.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }, [search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;

    const column = columns.find((col) => String(col.key) === sortKey);
    if (!column) return filtered;

    const next = [...filtered].sort((a, b) => {
      if (column.sortFn) {
        return column.sortFn(a, b);
      }

      const aValue = a[sortKey as keyof Patient];
      const bValue = b[sortKey as keyof Patient];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return aValue - bValue;
      }

      return String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    return sortDir === "asc" ? next : next.reverse();
  }, [filtered, columns, sortKey, sortDir]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div data-testid="patient-list-page" className="w-full">
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
        <div className="space-y-4">
          <DataTableToolbar
            query={search}
            onQueryChange={handleSearch}
            searchPlaceholder="Search patients..."
            recordCount={filtered.length}
          />

          <DataTable
            data-testid="patient-list-table"
            data={sorted}
            columns={columns}
            getRowId={(row) => row.id}
            selection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            sorting={{
              sortKey,
              sortDir,
              onChange: (key, dir) => {
                setSortKey(key);
                setSortDir(dir);
                setPage(1);
              },
            }}
            onRowClick={(row) => handleView(row)}
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
              total: filtered.length,
              page,
              onChange: setPage,
            }}
          />
        </div>
      </ComponentErrorBoundary>
    </div>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <circle cx="5" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
    </svg>
  );
}
