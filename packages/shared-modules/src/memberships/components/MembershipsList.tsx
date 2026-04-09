import { useState } from "react";
import { Button, Badge, DataTable, EmptyState } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMembershipsList, useMembershipsCount } from "../queries/memberships";
import type { Membership } from "../types";
import { MembershipFormDialog } from "./MembershipFormDialog";

interface MembershipsListProps {
  onSelectMembership: (membership: Membership) => void;
}

export function MembershipsList({ onSelectMembership }: MembershipsListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openCreate, setOpenCreate] = useState(false);
  const membershipsQuery = useMembershipsList({ page, pageSize });
  const countQuery = useMembershipsCount({});

  const columns: ColumnDef<Membership>[] = [
    {
      key: "name",
      header: "Name",
      width: "25%",
      render: (membership) => (
        <span className="font-medium">{membership.name}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      width: "35%",
      render: (membership) => membership.description || "-",
    },
    {
      key: "price",
      header: "Price",
      width: "15%",
      align: "right",
      render: (membership) => `₹${membership.price}`,
    },
    {
      key: "duration",
      header: "Duration",
      width: "15%",
      align: "center",
      render: (membership) => `${membership.duration} days`,
    },
    {
      key: "status",
      header: "Status",
      width: "10%",
      render: (membership) => (
        <Badge variant={membership.status === "active" ? "success" : "neutral"}>
          {membership.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Memberships</h1>
        <Button onClick={() => setOpenCreate(true)}>Create Membership</Button>
      </div>
      <DataTable
        data={membershipsQuery.data || []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={membershipsQuery.isLoading}
        onRowClick={onSelectMembership}
        pagination={{
          pageSize,
          total: countQuery.data || 0,
          page,
          onChange: setPage,
          onPageSizeChange: setPageSize,
          mode: "server",
        }}
        emptyState={<EmptyState title="No memberships found" description="Create your first membership to get started." />}
      />
      <MembershipFormDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
      />
    </div>
  );
}