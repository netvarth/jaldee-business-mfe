/**
 * GST Tax Invoice for a real Karty order — /karty/orders/:uid/tax-invoice
 *
 * Dedicated full-screen print-ready view of the official GST Tax Invoice.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import { InvoiceSheet } from "./TaxInvoicePage";
import { useOrderInvoice } from "../services/useOrderInvoice";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";

export function OrderTaxInvoicePage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { account } = useMFEProps();
  const sellerName = account?.name || "Business";
  const { data: model, isLoading, error } = useOrderInvoice(uid, sellerName);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 28px 64px" }}>
      <style>{`
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .no-print, nav, aside, header, footer, button {
            display: none !important;
          }
          .dcinv-sheet, .dcinv-sheet * {
            visibility: visible !important;
          }
          .dcinv-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Top action toolbar (hidden on print) */}
      <div className="no-print" style={{ maxWidth: 900, margin: "0 auto 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <span style={{ borderRadius: 6, background: "#f5f3ff", color: "#55349A", padding: "5px 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
            Karty
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>GST Tax Invoice</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              {model ? `${model.taxKind === "INTRA" ? "Intra-state · CGST + SGST" : "Inter-state · IGST"} · ${model.meta[0]?.value}` : `Order ${uid?.slice(0, 8)}`}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!model}
          style={{ height: 38, padding: "0 18px", borderRadius: 8, border: 0, background: "#55349A", color: "#fff", fontSize: 13, fontWeight: 600, cursor: model ? "pointer" : "not-allowed", opacity: model ? 1 : 0.5, boxShadow: "0 1px 3px rgba(0,0,0,.12)", display: "flex", alignItems: "center", gap: 8 }}
        >
          <Printer size={16} />
          <span>Print / Download PDF</span>
        </button>
      </div>

      {/* Invoice Sheet container */}
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "center" }}>
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", color: "#64748b", gap: 8 }}>
            <Loader2 className="animate-spin" size={24} color="#55349A" />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Generating GST Tax Invoice...</p>
          </div>
        )}
        {error && (
          <div style={{ maxWidth: 560, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", padding: "16px 18px", color: "#b91c1c", fontSize: 13 }}>
            Couldn't build the invoice for this order. {error instanceof Error ? error.message : ""}
          </div>
        )}
        {model && <InvoiceSheet m={model} />}
      </div>
    </div>
  );
}

export default OrderTaxInvoicePage;
