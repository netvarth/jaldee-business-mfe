import { useMemo, useState } from "react";
import { Badge, Button, DescriptionList, EmptyState, PageHeader, SectionCard, Tabs } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { resolveCustomerLabel } from "../../labels";
import { useCustomerDetail, useCustomerVisits } from "../queries/customers";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CustomerLinkedRecords } from "./CustomerLinkedRecords";

interface CustomerDetailProps {
  customerId: string;
  onBack?: () => void;
}

export function CustomerDetail({ customerId, onBack }: CustomerDetailProps) {
  const { account, product } = useSharedModulesContext();
  const customerLabel = resolveCustomerLabel(account.labels, product);
  const customerQuery = useCustomerDetail(customerId);
  const visits = useCustomerVisits(customerId);
  const [activeTab, setActiveTab] = useState("today");
  const [openEdit, setOpenEdit] = useState(false);

  const customer = customerQuery.data;

  const detailItems = useMemo(() => {
    if (!customer) {
      return [];
    }

    return [
      { label: `${customerLabel} ID`, value: customer.jaldeeId || "-" },
      { label: "Phone", value: customer.phoneNo ? `${customer.countryCode ?? ""} ${customer.phoneNo}`.trim() : "-" },
      { label: "Email", value: customer.email || "-" },
      { label: "Gender", value: customer.gender || "-" },
      { label: "Date of Birth", value: customer.dob || "-" },
      { label: "Address", value: customer.address || "-" },
    ];
  }, [customer, customerLabel]);

  if (customerQuery.isLoading) {
    return <SectionCard title={`Loading ${customerLabel}`}><div className="text-sm text-gray-500">Loading details...</div></SectionCard>;
  }

  if (!customer) {
    return (
      <EmptyState
        title={`${customerLabel} not found`}
        description={`The requested ${customerLabel.toLowerCase()} record could not be loaded.`}
        action={onBack ? <Button variant="secondary" onClick={onBack}>Back to list</Button> : undefined}
      />
    );
  }

  const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return (
    <>
      <PageHeader
        title={displayName || customerLabel}
        subtitle={`${customerLabel} profile and linked records`}
        back={onBack ? { label: `Back to ${customerLabel}s`, href: "#back" } : undefined}
        onNavigate={() => onBack?.()}
        actions={
          <>
            {customer.status && <Badge variant="info">{customer.status}</Badge>}
            <Button variant="secondary" onClick={() => setOpenEdit(true)}>Edit</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_1fr]">
        <SectionCard title={`${customerLabel} Summary`}>
          <DescriptionList items={detailItems} />
        </SectionCard>

        <SectionCard title="Linked Records" padding={false}>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              { value: "today", label: "Today", count: visits.today.data?.length },
              { value: "future", label: "Future", count: visits.future.data?.length },
              { value: "history", label: "History", count: visits.history.data?.length },
              { value: "orders", label: "Orders", count: visits.orders.data?.length },
            ]}
            className="px-4 pt-3"
          />
          <div className="p-4 pt-0">
            <CustomerLinkedRecords
              activeTab={activeTab}
              today={visits.today.data ?? []}
              future={visits.future.data ?? []}
              history={visits.history.data ?? []}
              orders={visits.orders.data ?? []}
              loading={
                visits.today.isLoading ||
                visits.future.isLoading ||
                visits.history.isLoading ||
                visits.orders.isLoading
              }
            />
          </div>
        </SectionCard>
      </div>

      <CustomerFormDialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        customerLabel={customerLabel}
        editingCustomer={customer}
      />
    </>
  );
}
