import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  type ColumnDef,
} from "@jaldee/design-system";
import { useUsers } from "../../services/useUsers";
import { useModal } from "../../contexts/ModalContext";
import CreateUserModal from "./CreateUserModal";
import type { BookingUser } from "../../data/sessionStore";

export default function UsersPage() {
  const { users, loading, refresh } = useUsers();
  const { openModal } = useModal();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter(
      (user) =>
        !normalized ||
        user.displayName.toLowerCase().includes(normalized) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(normalized),
    );
  }, [query, users]);

  const columns = useMemo<ColumnDef<BookingUser>[]>(
    () => [
      { key: "displayName", header: "Display name", sortable: true, className: "font-semibold" },
      {
        key: "name",
        header: "Name",
        sortable: true,
        render: (user) => `${user.firstName} ${user.lastName}`.trim() || "-",
        sortFn: (a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      },
      { key: "title", header: "Title / role", sortable: true, render: (user) => user.title || "-" },
      {
        key: "hasLogin",
        header: "Login",
        render: (user) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.hasLogin ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {user.hasLogin ? "Login · CRM" : "Booking only"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (user) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
            {user.status}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <section
      id="page-users"
      data-testid="bookings-users-page"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-slate-50 p-4 md:p-6"
    >
      <PageHeader
        title="Users"
        subtitle="Manage booking users, access, and availability."
        actions={
          <Button
            id="bookings-users-create"
            data-testid="bookings-users-create"
            onClick={() => openModal(<CreateUserModal onCreated={() => refresh()} />)}
          >
            Create User
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          id="bookings-users-search"
          data-testid="bookings-users-search"
          type="search"
          placeholder="Search users"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-sm"
        />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(user) => user.userUid}
        loading={loading}
        pagination={{
          page,
          pageSize: 10,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No users found" description="Try changing the search." />}
        data-testid="bookings-users"
      />
    </section>
  );
}
