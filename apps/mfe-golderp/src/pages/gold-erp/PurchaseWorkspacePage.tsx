import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/gold-erp/PageHeader";
import { SectionCard } from "@/components/gold-erp/SectionCard";
import { EmptyStateBlock } from "@/components/gold-erp/EmptyStateBlock";
import { PurchaseOrderFormModal } from "@/components/gold-erp/PurchaseOrderFormModal";
import { PurchaseOrderDetailDrawer } from "@/components/gold-erp/PurchaseOrderDetailDrawer";
import { usePurchaseOrders } from "@/hooks/usePurchase";

export default function PurchaseWorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { poUid } = useParams<{ poUid: string }>();
  const isCreateMode = !poUid;
  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders();

  const selectedPo = useMemo(
    () => purchaseOrders.find((purchaseOrder) => purchaseOrder.poUid === poUid) || null,
    [poUid, purchaseOrders],
  );

  const handleBack = () => {
    const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
    navigate(returnTo || "/purchase");
  };

  return (
    <div className="erp-section-gap">
      <PageHeader
        title={isCreateMode ? "Create Purchase Order" : "Purchase Order Workspace"}
        subtitle={
          isCreateMode
            ? "Fill in the details to create a new purchase order. After creation, you can review and manage it in the workspace."
            : "Review the PO, receive GRNs, and manage draft tags."
        }
      />

      <SectionCard>
        {isCreateMode ? (
          <PurchaseOrderFormModal embedded onOpenChange={(open) => { if (!open) handleBack(); }} />
        ) : isLoading ? (
          <div className="py-8 text-sm text-muted-foreground">Loading purchase order...</div>
        ) : selectedPo ? (
          <PurchaseOrderDetailDrawer embedded po={selectedPo} onClose={handleBack} />
        ) : (
          <EmptyStateBlock
            title="Purchase order not found"
            description="The requested purchase order is unavailable or was removed."
            className="rounded-md border border-dashed py-10"
          />
        )}
      </SectionCard>
    </div>
  );
}
