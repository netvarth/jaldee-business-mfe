import { useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { calculateOrderTotals, formatCurrency, formatDate } from "@/lib/gold-erp-utils";
import { useSalesOrderDetails } from "@/hooks/useSales";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
}

export function InvoicePrintModal({ open, onOpenChange, order }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const orderUid = order?.orderUid || null;
  const { data: liveOrder } = useSalesOrderDetails(orderUid);

  if (!order) return null;

  const resolvedOrder = liveOrder || order;
  const totals = calculateOrderTotals(resolvedOrder);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 40px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { border-bottom: 1px solid #000; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-0.5rem)] max-w-[calc(100vw-0.5rem)] sm:max-w-[800px] h-[94vh] sm:h-[80vh] p-2 sm:p-6 flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Print Tax Invoice</DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex-1 min-h-0 overflow-y-auto rounded-md border border-border bg-white p-2 sm:p-8 text-black shadow-inner overscroll-contain">
          <div ref={printRef}>
            <div className="mb-4 flex flex-col gap-3 border-b-2 border-black pb-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>GOLD ERP JEWELLERS</div>
                <div style={{ fontSize: "11px", color: "#555" }}>Tax invoice</div>
              </div>
              <div className="text-left sm:text-right">
                <h1 style={{ margin: 0, fontSize: "22px" }}>INVOICE</h1>
                <div style={{ fontSize: "12px", marginTop: "8px" }}>Invoice No: INV-{resolvedOrder.orderNumber}</div>
                <div style={{ fontSize: "12px" }}>Date: {formatDate(resolvedOrder.orderDate)}</div>
              </div>
            </div>

            <div style={{ marginBottom: "20px", fontSize: "12px" }}>
              <strong style={{ display: "block", marginBottom: "5px" }}>Billed To:</strong>
              <div>{resolvedOrder.customerName}</div>
              <div>{resolvedOrder.customerPhone || "-"}</div>
            </div>

            <div className="mb-6 max-w-full overflow-x-auto overscroll-x-contain">
              <table style={{ width: "100%", minWidth: "480px", borderCollapse: "collapse", fontSize: "12px" }}>
                <colgroup>
                  <col style={{ width: "36px" }} />
                  <col style={{ minWidth: "180px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "100px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ padding: "8px 6px" }}>#</th>
                    <th style={{ padding: "8px 6px" }}>Description</th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>Wt (g)</th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(resolvedOrder.lines || []).map((line: any, index: number) => (
                    <tr key={line.lineUid || index}>
                      <td style={{ padding: "8px 6px", verticalAlign: "top" }}>{index + 1}</td>
                      <td style={{ padding: "8px 6px", whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word", minWidth: "180px" }}>
                        {line.itemName || line.tagNumber}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px", verticalAlign: "top" }}>{line.grossWt || line.netWt || 0}</td>
                      <td style={{ textAlign: "right", padding: "8px 6px", verticalAlign: "top" }}>{formatCurrency(line.finalPrice || line.sellingPrice || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-stretch sm:justify-end">
              <div className="w-full sm:w-[350px]" style={{ border: "1px solid #000", padding: "14px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "12px" }}><span>Gross Total:</span><span>{formatCurrency(totals.lineTotal)}</span></div>
                {totals.discountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "12px" }}><span>Discount:</span><span>- {formatCurrency(totals.discountTotal)}</span></div>}
                {totals.oldGoldTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "12px" }}><span>Old Gold:</span><span>- {formatCurrency(totals.oldGoldTotal)}</span></div>}
                {totals.advanceTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "12px" }}><span>Advance Paid:</span><span>- {formatCurrency(totals.advanceTotal)}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "15px", fontWeight: "bold", borderTop: "1px solid #000", paddingTop: "10px", marginTop: "10px" }}><span>Net Payable:</span><span>{formatCurrency(resolvedOrder.balanceDue ?? totals.payable)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 shrink-0 gap-2 border-t border-border pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print Full Invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
