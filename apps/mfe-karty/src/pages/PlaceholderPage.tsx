import { EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useLocation, useParams } from "react-router-dom";

const sectionLabels: Record<string, string> = {
  karty: "Overview",
  orders: "Orders",
  "sales-returns": "Sales Returns",
  inventory: "Inventory",
  catalog: "Items/Products",
  suppliers: "Suppliers",
  discounts: "Discounts & Coupons",
  "price-lists": "Price Lists",
  barcode: "Barcode / QR",
  delivery: "Delivery Tracking",
  commissions: "Sales Targets & Commissions",
  loyalty: "Loyalty Points",
  stores: "Stores",
  customers: "Customers",
  users: "Users",
  finance: "Finance",
  reports: "Reports",
  drive: "Drive",
  tasks: "Tasks",
  membership: "Membership",
  leads: "Leads",
  "audit-log": "Audit Log",
  settings: "Settings",
};

export default function PlaceholderPage() {
  const location = useLocation();
  const { section = "" } = useParams();
  const pathSection = location.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const title = sectionLabels[section] ?? sectionLabels[pathSection] ?? "Section";

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title={title}
          subtitle="This section is scaffolded and routed correctly in the Karty microfrontend."
        />

        <SectionCard>
          <EmptyState
            title={`${title} is ready for implementation`}
            description="The route now resolves correctly through shell and remote mount. Build the Karty feature here next."
          />
        </SectionCard>
      </div>
    </div>
  );
}
