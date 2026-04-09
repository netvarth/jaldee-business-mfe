import { SectionCard } from "@jaldee/design-system";

interface MemberGroupDetailsProps {
  groupId: string;
}

export function MemberGroupDetails({ groupId }: MemberGroupDetailsProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Member Group Details</h1>
      <SectionCard title="Member Group Details">
        <p>Group ID: {groupId}</p>
        <p>Member group details coming soon...</p>
      </SectionCard>
    </div>
  );
}