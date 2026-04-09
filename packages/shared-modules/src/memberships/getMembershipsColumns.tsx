import type { ColumnDef } from "@jaldee/design-system";
import { Badge } from "@jaldee/design-system";
import type { Membership } from "./types";

export function getMembershipsColumns(): ColumnDef<Membership>[] {
  return [
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
}