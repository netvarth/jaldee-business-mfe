import { SectionCard } from "@jaldee/design-system";

interface CreateMemberProps {
  source?: string;
  memberId?: string;
}

export function CreateMember({ source, memberId }: CreateMemberProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {source ? `Create Member (${source})` : "Create Member"}
      </h1>
      <SectionCard title="Create Member">
        <p>Create member form coming soon...</p>
        {memberId && <p>Member ID: {memberId}</p>}
      </SectionCard>
    </div>
  );
}