import type { ColumnDef } from "@jaldee/design-system";
import type { ApiScope } from "../types";
import type { Customer } from "./types";

interface GetCustomerColumnsOptions {
  apiScope: ApiScope;
  customerLabel: string;
}

export function getCustomerColumns({
  apiScope,
  customerLabel,
}: GetCustomerColumnsOptions): ColumnDef<Customer>[] {
  const domainColumns: ColumnDef<Customer>[] = [
    {
      key: "jaldeeId",
      header: `${customerLabel} ID`,
      render: (customer) => <span className="font-mono text-xs font-medium">{customer.jaldeeId || "-"}</span>,
    },
    {
      key: "firstName",
      header: customerLabel,
      render: (customer) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "-"}
        </span>
      ),
    },
    {
      key: "phoneNo",
      header: "Phone",
      render: (customer) => customer.phoneNo ? `${customer.countryCode ?? ""} ${customer.phoneNo}`.trim() : "-",
    },
    {
      key: "email",
      header: "Email",
      render: (customer) => customer.email || "-",
    },
  ];

  const scopeColumns: ColumnDef<Customer>[] =
    apiScope === "global"
      ? [
          {
            key: "status",
            header: "Status",
            render: (customer) => customer.status || "-",
          },
        ]
      : [
          {
            key: "visitCount",
            header: "Visits",
            align: "right",
            render: (customer) => String(customer.visitCount ?? 0),
          },
          {
            key: "lastVisit",
            header: "Last Visit",
            render: (customer) => customer.lastVisit || "-",
          },
        ];

  return [...domainColumns, ...scopeColumns];
}
