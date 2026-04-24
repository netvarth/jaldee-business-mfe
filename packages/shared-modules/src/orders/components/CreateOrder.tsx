import { Button, EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { SharedOrdersLayout } from "./shared";

export function CreateOrder() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  return (
    <SharedOrdersLayout
      title="Create Order"
      subtitle="Order creation is not yet available in the shared React module."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`${basePath}/orders/dashboard`)}>
          Back
        </Button>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Create order not implemented"
          description="This screen exists in the legacy Angular Orders module. The shared React module currently supports dashboard, grid, and order details."
        />
      </SectionCard>
    </SharedOrdersLayout>
  );
}
