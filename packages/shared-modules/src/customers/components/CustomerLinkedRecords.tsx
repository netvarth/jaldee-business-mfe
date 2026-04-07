import { DataTable, EmptyState } from "@jaldee/design-system";
import type { CustomerVisit } from "../types";

interface CustomerLinkedRecordsProps {
  activeTab: string;
  today: CustomerVisit[];
  future: CustomerVisit[];
  history: CustomerVisit[];
  orders: CustomerVisit[];
  loading?: boolean;
}

const columns = [
  { key: "title", header: "Title" },
  { key: "service", header: "Service" },
  { key: "date", header: "Date" },
  { key: "time", header: "Time" },
  { key: "status", header: "Status" },
] as const;

export function CustomerLinkedRecords({
  activeTab,
  today,
  future,
  history,
  orders,
  loading,
}: CustomerLinkedRecordsProps) {
  const data =
    activeTab === "today"
      ? today
      : activeTab === "future"
        ? future
        : activeTab === "history"
          ? history
          : orders;

  return (
    <DataTable
      data={data}
      columns={columns.map((column) => ({
        key: column.key,
        header: column.header,
        render: (row: CustomerVisit) => (row[column.key] as string | undefined) || "-",
      }))}
      loading={loading}
      emptyState={
        <EmptyState
          title="No linked records"
          description="There are no records available for the selected tab."
        />
      }
    />
  );
}
