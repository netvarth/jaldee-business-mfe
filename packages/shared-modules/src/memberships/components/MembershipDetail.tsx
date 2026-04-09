import { Button, DescriptionList, PageHeader, SectionCard } from "@jaldee/design-system";
import { useState } from "react";
import { useMembershipDetail } from "../queries/memberships";
import { MembershipFormDialog } from "./MembershipFormDialog";

interface MembershipDetailProps {
  membershipId: string;
  onBack?: () => void;
}

export function MembershipDetail({ membershipId, onBack }: MembershipDetailProps) {
  const membershipQuery = useMembershipDetail(membershipId);
  const [openEdit, setOpenEdit] = useState(false);
  const membership = membershipQuery.data;

  if (membershipQuery.isLoading) {
    return <div>Loading...</div>;
  }

  if (!membership) {
    return <div>Membership not found</div>;
  }

  const detailItems = [
    { label: "Name", value: membership.name },
    { label: "Description", value: membership.description || "-" },
    { label: "Price", value: `$${membership.price}` },
    { label: "Duration", value: `${membership.duration} days` },
    { label: "Status", value: membership.status },
    { label: "Created At", value: new Date(membership.createdAt).toLocaleDateString() },
    { label: "Updated At", value: new Date(membership.updatedAt).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader
        title={membership.name}
        back={onBack ? { label: "Back to Memberships", href: "#back" } : undefined}
        onNavigate={() => onBack?.()}
        actions={<Button onClick={() => setOpenEdit(true)}>Edit</Button>}
      />
      <SectionCard title="Membership Details">
        <DescriptionList items={detailItems} />
      </SectionCard>
      <MembershipFormDialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        editingMembership={membership}
      />
    </div>
  );
}