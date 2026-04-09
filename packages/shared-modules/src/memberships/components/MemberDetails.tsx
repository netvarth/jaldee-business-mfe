import { SectionCard } from "@jaldee/design-system";

interface MemberDetailsProps {
  memberId: string;
}

export function MemberDetails({ memberId }: MemberDetailsProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Member Details</h1>
      <SectionCard title="Member Details">
        <p>Member ID: {memberId}</p>
        <p>Member details coming soon...</p>
      </SectionCard>
    </div>
  );
}