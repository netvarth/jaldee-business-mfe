import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { CreditCard, CheckCircle2, ShieldCheck, Printer, Copy, Lock } from "lucide-react";

export interface PublicPayPageProps {
  paySlug?: string;
}

export function PublicPayPage({ paySlug: propSlug }: PublicPayPageProps) {
  const params = useParams<{ "*": string; paySlug?: string; slug?: string }>();
  const slug = propSlug || params.paySlug || params.slug || params["*"] || "";

  // Parse details if slug follows pattern like 375916190322AthiraKR
  const parsedInfo = useMemo(() => {
    if (!slug) return { accountId: "375916190322", name: "Athira KR", ref: "375916190322AthiraKR" };
    const match = slug.match(/^(\d+)?([A-Za-z\s_-]+)?/);
    const accountId = match?.[1] || "375916190322";
    let rawName = match?.[2] || slug.replace(/^\d+/, "");
    if (!rawName) rawName = "Athira KR";
    // Format camelCase or concat names into readable space separated words
    const formattedName = rawName
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .trim();

    return {
      accountId,
      name: formattedName || "Athira KR",
      ref: slug,
    };
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Payment link copied to clipboard!");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", padding: "32px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 768, margin: "0 auto" }}>
        
        {/* Header Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #4F46E5 0%, #312E81 100%)",
            borderRadius: "16px 16px 0 0",
            padding: "32px 24px",
            color: "#FFFFFF",
            boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CreditCard size={26} color="#FFF" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                  Jaldee Pay
                </h1>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.875rem", opacity: 0.9 }}>Public Payment & Statement Portal</p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid rgba(52, 211, 153, 0.4)",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#6EE7B7",
              }}
            >
              <ShieldCheck size={14} /> Public Gateway (No Login Required)
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "0 0 16px 16px",
            padding: "32px 24px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
            border: "1px solid #E2E8F0",
            borderTop: "none",
          }}
        >
          {/* Active Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 12,
              padding: "16px",
              marginBottom: 28,
            }}
          >
            <CheckCircle2 size={24} color="#16A34A" />
            <div>
              <div style={{ fontWeight: 600, color: "#14532D", fontSize: "0.95rem" }}>Payment Reference Verified</div>
              <div style={{ color: "#15803D", fontSize: "0.85rem", marginTop: 2 }}>
                Reference Code: <code style={{ background: "#DCFCE7", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{parsedInfo.ref}</code>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 20,
              marginBottom: 32,
            }}
          >
            <div style={{ background: "#F8FAFC", padding: 16, borderRadius: 10, border: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 600 }}>
                Account / Business ID
              </span>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0F172A", marginTop: 4 }}>
                {parsedInfo.accountId}
              </div>
            </div>

            <div style={{ background: "#F8FAFC", padding: 16, borderRadius: 10, border: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 600 }}>
                Beneficiary Name
              </span>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0F172A", marginTop: 4 }}>
                {parsedInfo.name}
              </div>
            </div>

            <div style={{ background: "#F8FAFC", padding: 16, borderRadius: 10, border: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 600 }}>
                Payment Access Link
              </span>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4F46E5", marginTop: 4, wordBreak: "break-all" }}>
                /pay/{parsedInfo.ref}
              </div>
            </div>
          </div>

          {/* Statement Breakdown */}
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
            <div style={{ background: "#F8FAFC", padding: "14px 20px", borderBottom: "1px solid #E2E8F0", fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}>
              <Lock size={16} /> Payment Statement Details
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #E2E8F0" }}>
                <span style={{ color: "#64748B" }}>Gross Payable Amount</span>
                <span style={{ fontWeight: 600, color: "#0F172A" }}>₹45,000.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #E2E8F0" }}>
                <span style={{ color: "#64748B" }}>Deductions / Fee</span>
                <span style={{ fontWeight: 600, color: "#DC2626" }}>- ₹3,200.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0 0", fontSize: "1.1rem", fontWeight: 700 }}>
                <span style={{ color: "#0F172A" }}>Total Net Amount</span>
                <span style={{ color: "#16A34A" }}>₹41,800.00</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              onClick={handleCopyLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <Copy size={16} /> Copy Pay Link
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: "#4F46E5",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicPayPage;
