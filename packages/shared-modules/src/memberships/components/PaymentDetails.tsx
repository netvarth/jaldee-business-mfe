import { SectionCard } from "@jaldee/design-system";

interface PaymentDetailsProps {
  memberId: string;
}

export function PaymentDetails({ memberId }: PaymentDetailsProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payment Details</h1>
      <SectionCard title="Payment Details">
        <p>Member ID: {memberId}</p>
        <p>Payment details coming soon...</p>
      </SectionCard>
    </div>
  );
}