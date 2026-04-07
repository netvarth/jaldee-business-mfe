import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Input, PageHeader, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { resolveCustomerLabel } from "../../labels";
import { useCustomersCount, useCustomersList } from "../queries/customers";
import { getCustomerColumns } from "../getCustomerColumns";
import type { Customer, CustomerFilters } from "../types";
import { CustomerFormDialog } from "./CustomerFormDialog";

interface CustomersListProps {
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomersList({ onSelectCustomer }: CustomersListProps) {
  const { account, product, apiScope } = useSharedModulesContext();
  const customerLabel = resolveCustomerLabel(account.labels, product);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const filters = useMemo<CustomerFilters>(() => ({
    search,
    status: apiScope === "global" ? undefined : "ACTIVE",
    page: 1,
    pageSize: 25,
  }), [apiScope, search]);

  const customersQuery = useCustomersList(filters);
  const countQuery = useCustomersCount(filters);
  const columns = useMemo(
    () => getCustomerColumns({ apiScope, customerLabel }),
    [apiScope, customerLabel]
  );

  return (
    <>
      <PageHeader
        title={`${customerLabel}s`}
        subtitle={`Search, review, and manage ${customerLabel.toLowerCase()} records across ${apiScope} scope.`}
        actions={<Button onClick={() => setOpenCreate(true)}>Create {customerLabel}</Button>}
      />

      <SectionCard
        title={`${customerLabel} Directory`}
        actions={
          <div className="w-[280px]">
            <Input
              label="Search"
              placeholder={`Search by name, phone, or ${customerLabel.toLowerCase()} ID`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      >
        <DataTable
          data={customersQuery.data ?? []}
          columns={columns}
          loading={customersQuery.isLoading}
          onRowClick={onSelectCustomer}
          emptyState={
            <EmptyState
              title={`No ${customerLabel.toLowerCase()} records`}
              description={`Try changing the current filters or create a new ${customerLabel.toLowerCase()}.`}
            />
          }
          pagination={{
            page: 1,
            pageSize: 25,
            total: countQuery.data ?? customersQuery.data?.length ?? 0,
            onChange: () => undefined,
          }}
        />
      </SectionCard>

      <CustomerFormDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        customerLabel={customerLabel}
      />
    </>
  );
}
