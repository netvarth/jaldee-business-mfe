/**
 * GST Tax Invoice — print-ready, snapshot-faithful invoice template for Karty.
 *
 * Ported from the Claude Design reference "GST Tax Invoice.dc.html" (project
 * "Karty MFE design reference"). One data model drives three variants:
 *   • INTRA-state  → CGST + SGST split      (B2C / same-state B2B)
 *   • INTER-state  → IGST only              (different-state B2B)
 *   • CREDIT NOTE  → reversed, red styling  (return against an invoice)
 *
 * Design intent (carried over verbatim from the handoff notes): an issued invoice
 * is a FROZEN SNAPSHOT. Every field below — GSTINs, state codes, place of supply,
 * reverse-charge flag, per-line HSN + rate, per-slab tax split, discounts, the
 * rounding policy AND the resulting round-off, snapshot version + issue date — is
 * stored at issue and never recomputed. This component only renders a persisted
 * model; it does no tax math. Backend wiring (an order's issued invoice snapshot)
 * is deliberately left as a later step — this is Karty UI only, no finance service.
 *
 * Route: /karty/invoices/tax-invoice
 */
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// ─── Persisted snapshot model ───────────────────────────────────────────────

export type TaxKind = "INTRA" | "INTER";
export type DocType = "INVOICE" | "CREDIT_NOTE";

export interface Party {
  label: string;
  name: string;
  address: string; // may contain <br>
  gstin?: string;
  gstinNote?: string; // e.g. "Unregistered (B2C)"
  stateLine: string; // "Maharashtra, Code 27"
  contactLines?: string[];
  emphasiseGstin?: boolean;
  extraNote?: string;
}

export interface InvoiceLine {
  sr: number | string;
  desc: string;
  hsn: string;
  qty: string;
  rate: string;
  disc?: string;
  taxable: string;
  // intra
  crate?: string; camt?: string; srate?: string; samt?: string;
  // inter
  irate?: string; iamt?: string;
  total: string;
}

export interface Slab {
  slab: string; taxable: string;
  cgst?: string; sgst?: string; igst?: string; tax: string;
}

export interface MetaRow { label: string; value: string; emphasise?: boolean }
export interface TotalRow { label: string; value: string; dashedTop?: boolean }

export interface InvoiceModel {
  docType: DocType;
  taxKind: TaxKind;
  accent: string;               // #55349A invoice, #dc2626 credit note
  badge: string;                // "A" / "B" / "C"
  badgeTint: string;            // header strip bg
  badgeText: string;            // header strip label
  title: string;                // "TAX INVOICE" / "CREDIT NOTE"
  subtitle: string;             // "Original for Recipient" / "Return / Adjustment"
  meta: MetaRow[];              // right-hand invoice no/date/place-of-supply…
  seller: Party;
  buyer: Party;
  lines: InvoiceLine[];
  slabs: Slab[];                // rate-wise breakup rows
  slabTotal: Slab;             // breakup total row
  totals: TotalRow[];
  grandLabel: string;
  grandValue: string;
  amountInWords: string;
  showQr: boolean;
  qr: string[];                 // 49 cells (colors) — decorative fallback when no upiPayload
  upiPayload?: string;          // real UPI intent string → scannable QR when present
  bank?: string[];             // bank/terms lines
  signatoryName?: string;      // "for <name>" under the signature line; falls back to seller name
  adjustmentNote?: string;     // credit note
  snapshotNote: string;
}

// ─── Sample snapshot data (from the design reference) ───────────────────────

const QR_SEED = [1,0,1,1,0,1,1, 0,1,1,0,1,0,0, 1,1,0,1,1,0,1, 0,0,1,1,0,1,0, 1,0,1,0,1,1,1, 1,1,0,1,0,0,1, 0,1,1,0,1,1,0];
export const qrCells = (accent: string) => QR_SEED.map((v) => (v ? accent : "#ffffff"));

const SELLER: Party = {
  label: "Sold By",
  name: "Sunrise Retail Pvt Ltd",
  address: "Unit 4, Andheri East Industrial Estate,<br>Mumbai, Maharashtra — 400093",
  gstin: "27AABCS1429B1ZP",
  stateLine: "Maharashtra, Code 27",
  contactLines: ["Contact: +91 98200 11223"],
};

const linesA: InvoiceLine[] = [
  { sr: 1, desc: "Cotton Kurta — Men's (M)", hsn: "6205", qty: "2 pcs", rate: "1,299.00", disc: "—", taxable: "2,598.00", crate: "2.5%", camt: "64.95", srate: "2.5%", samt: "64.95", total: "2,727.90" },
  { sr: 2, desc: "Silk Saree — Kanjivaram", hsn: "5007", qty: "1 pc", rate: "4,500.00", disc: "500.00", taxable: "4,000.00", crate: "2.5%", camt: "100.00", srate: "2.5%", samt: "100.00", total: "4,200.00" },
  { sr: 3, desc: "Leather Wallet — Bi-fold", hsn: "4202", qty: "3 pcs", rate: "799.00", disc: "—", taxable: "2,397.00", crate: "9%", camt: "215.73", srate: "9%", samt: "215.73", total: "2,828.46" },
  { sr: 4, desc: "Wall Clock — Analog", hsn: "9105", qty: "1 pc", rate: "1,250.00", disc: "—", taxable: "1,250.00", crate: "6%", camt: "75.00", srate: "6%", samt: "75.00", total: "1,400.00" },
  { sr: 5, desc: "Steel Bottle — 1L", hsn: "9617", qty: "4 pcs", rate: "449.00", disc: "—", taxable: "1,796.00", crate: "9%", camt: "161.64", srate: "9%", samt: "161.64", total: "2,119.28" },
  { sr: 6, desc: "Scented Candle Set", hsn: "3406", qty: "2 pcs", rate: "349.00", disc: "—", taxable: "698.00", crate: "6%", camt: "41.88", srate: "6%", samt: "41.88", total: "781.76" },
  { sr: 7, desc: "Ceramic Mug — 350ml", hsn: "6912", qty: "6 pcs", rate: "199.00", disc: "—", taxable: "1,194.00", crate: "9%", camt: "107.46", srate: "9%", samt: "107.46", total: "1,408.92" },
];
const linesB: InvoiceLine[] = [
  { sr: 1, desc: "Cotton Kurta — Men's (M)", hsn: "6205", qty: "2 pcs", rate: "1,299.00", disc: "—", taxable: "2,598.00", irate: "5%", iamt: "129.90", total: "2,727.90" },
  { sr: 2, desc: "Silk Saree — Kanjivaram", hsn: "5007", qty: "1 pc", rate: "4,500.00", disc: "500.00", taxable: "4,000.00", irate: "5%", iamt: "200.00", total: "4,200.00" },
  { sr: 3, desc: "Leather Wallet — Bi-fold", hsn: "4202", qty: "3 pcs", rate: "799.00", disc: "—", taxable: "2,397.00", irate: "18%", iamt: "431.46", total: "2,828.46" },
  { sr: 4, desc: "Wall Clock — Analog", hsn: "9105", qty: "1 pc", rate: "1,250.00", disc: "—", taxable: "1,250.00", irate: "12%", iamt: "150.00", total: "1,400.00" },
  { sr: 5, desc: "Steel Bottle — 1L", hsn: "9617", qty: "4 pcs", rate: "449.00", disc: "—", taxable: "1,796.00", irate: "18%", iamt: "323.28", total: "2,119.28" },
  { sr: 6, desc: "Scented Candle Set", hsn: "3406", qty: "2 pcs", rate: "349.00", disc: "—", taxable: "698.00", irate: "12%", iamt: "83.76", total: "781.76" },
  { sr: 7, desc: "Ceramic Mug — 350ml", hsn: "6912", qty: "6 pcs", rate: "199.00", disc: "—", taxable: "1,194.00", irate: "18%", iamt: "214.92", total: "1,408.92" },
];
const linesC: InvoiceLine[] = [
  { sr: 1, desc: "Leather Wallet — Bi-fold", hsn: "4202", qty: "1 pc", rate: "799.00", taxable: "− 799.00", crate: "9%", camt: "71.91", srate: "9%", samt: "71.91", total: "− 942.82" },
  { sr: 2, desc: "Ceramic Mug — 350ml", hsn: "6912", qty: "6 pcs", rate: "199.00", taxable: "− 1,194.00", crate: "9%", camt: "107.46", srate: "9%", samt: "107.46", total: "− 1,408.92" },
];

const INVOICE_A: InvoiceModel = {
  docType: "INVOICE", taxKind: "INTRA", accent: "#55349A",
  badge: "A", badgeTint: "#f5f3ff", badgeText: "Intra-state · B2C · CGST + SGST split",
  title: "TAX INVOICE", subtitle: "Original for Recipient",
  meta: [
    { label: "Invoice No.", value: "INV-2026-00842" },
    { label: "Invoice Date", value: "12 Aug 2026" },
    { label: "Place of Supply", value: "Maharashtra (27)" },
    { label: "Reverse Charge", value: "No" },
  ],
  seller: SELLER,
  buyer: {
    label: "Bill To / Ship To", name: "Rohan Deshpande",
    address: "B-1203, Hiranandani Gardens, Powai,<br>Mumbai, Maharashtra — 400076",
    gstinNote: "Unregistered (B2C)", stateLine: "Maharashtra, Code 27",
    contactLines: ["Phone: +91 90045 67890"],
  },
  lines: linesA,
  slabs: [
    { slab: "5%", taxable: "6,598.00", cgst: "164.95", sgst: "164.95", tax: "329.90" },
    { slab: "12%", taxable: "1,948.00", cgst: "116.88", sgst: "116.88", tax: "233.76" },
    { slab: "18%", taxable: "5,387.00", cgst: "484.83", sgst: "484.83", tax: "969.66" },
  ],
  slabTotal: { slab: "Total", taxable: "13,933.00", cgst: "766.66", sgst: "766.66", tax: "1,533.32" },
  totals: [
    { label: "Sub-total", value: "₹14,433.00" },
    { label: "Total Discount", value: "− ₹500.00" },
    { label: "Taxable Value", value: "₹13,933.00" },
    { label: "CGST", value: "₹766.66" },
    { label: "SGST", value: "₹766.66" },
    { label: "Round-off", value: "− ₹0.32", dashedTop: true },
  ],
  grandLabel: "Grand Total", grandValue: "₹15,466.00",
  amountInWords: "Fifteen Thousand Four Hundred Sixty-Six Rupees Only",
  showQr: true, qr: qrCells("#1E1B4B"),
  bank: [
    "A/c: Sunrise Retail Pvt Ltd · HDFC0000123 · A/c 50100XXXXXX21",
    "UPI: sunriseretail@hdfcbank",
    "Goods once sold are taken back only per return policy. E&OE.",
  ],
  snapshotNote: "This is a system-generated invoice — snapshot v1, issued 12 Aug 2026. Figures are frozen at issue and never recalculated.",
};

const INVOICE_B: InvoiceModel = {
  docType: "INVOICE", taxKind: "INTER", accent: "#55349A",
  badge: "B", badgeTint: "#f5f3ff", badgeText: "Inter-state · B2B · IGST only",
  title: "TAX INVOICE", subtitle: "Original for Recipient",
  meta: [
    { label: "Invoice No.", value: "INV-2026-00843" },
    { label: "Invoice Date", value: "12 Aug 2026" },
    { label: "Place of Supply", value: "Karnataka (29)", emphasise: true },
    { label: "Reverse Charge", value: "No" },
  ],
  seller: SELLER,
  buyer: {
    label: "Bill To", name: "Nandini Traders",
    address: "No. 42, 3rd Block, Jayanagar,<br>Bengaluru, Karnataka — 560011",
    gstin: "29AAGCN4521R1Z8", emphasiseGstin: true, stateLine: "Karnataka, Code 29",
    extraNote: "Ship To — same as Bill To",
  },
  lines: linesB,
  slabs: [
    { slab: "5%", taxable: "6,598.00", igst: "329.90", tax: "329.90" },
    { slab: "12%", taxable: "1,948.00", igst: "233.76", tax: "233.76" },
    { slab: "18%", taxable: "5,387.00", igst: "969.66", tax: "969.66" },
  ],
  slabTotal: { slab: "Total", taxable: "13,933.00", igst: "1,533.32", tax: "1,533.32" },
  totals: [
    { label: "Sub-total", value: "₹14,433.00" },
    { label: "Total Discount", value: "− ₹500.00" },
    { label: "Taxable Value", value: "₹13,933.00" },
    { label: "IGST", value: "₹1,533.32" },
    { label: "Round-off", value: "− ₹0.32", dashedTop: true },
  ],
  grandLabel: "Grand Total", grandValue: "₹15,466.00",
  amountInWords: "Fifteen Thousand Four Hundred Sixty-Six Rupees Only",
  showQr: true, qr: qrCells("#1E1B4B"),
  bank: [
    "A/c: Sunrise Retail Pvt Ltd · HDFC0000123 · A/c 50100XXXXXX21",
    "UPI: sunriseretail@hdfcbank",
    "Interest @18% p.a. on overdue B2B invoices. E&OE.",
  ],
  snapshotNote: "This is a system-generated invoice — snapshot v1, issued 12 Aug 2026. Figures are frozen at issue and never recalculated.",
};

const INVOICE_C: InvoiceModel = {
  docType: "CREDIT_NOTE", taxKind: "INTRA", accent: "#dc2626",
  badge: "C", badgeTint: "#fef2f2", badgeText: "Credit Note · return against Invoice A",
  title: "CREDIT NOTE", subtitle: "Return / Adjustment",
  meta: [
    { label: "Credit Note No.", value: "CN-2026-00087" },
    { label: "Date", value: "14 Aug 2026" },
    { label: "Against Invoice", value: "INV-2026-00842", emphasise: true },
    { label: "Reason", value: "Goods returned" },
  ],
  seller: { ...SELLER, label: "Issued By", contactLines: [] },
  buyer: {
    label: "Credit To", name: "Rohan Deshpande",
    address: "B-1203, Hiranandani Gardens, Powai,<br>Mumbai, Maharashtra — 400076",
    stateLine: "Maharashtra, Code 27", contactLines: ["Phone: +91 90045 67890"],
  },
  lines: linesC,
  slabs: [{ slab: "18%", taxable: "1,993.00", cgst: "179.37", sgst: "179.37", tax: "358.74" }],
  slabTotal: { slab: "Total", taxable: "1,993.00", cgst: "179.37", sgst: "179.37", tax: "358.74" },
  totals: [
    { label: "Taxable Value", value: "₹1,993.00" },
    { label: "CGST", value: "₹179.37" },
    { label: "SGST", value: "₹179.37" },
    { label: "Round-off", value: "+ ₹0.26", dashedTop: true },
  ],
  grandLabel: "Total Credit", grandValue: "− ₹2,352.00",
  amountInWords: "Two Thousand Three Hundred Fifty-Two Rupees Only",
  showQr: false, qr: [],
  adjustmentNote: "Credit adjusted against original invoice INV-2026-00842. Refund via original payment mode where applicable.",
  snapshotNote: "System-generated credit note — snapshot v1, issued 14 Aug 2026. Linked to INV-2026-00842 snapshot v1.",
};

const NOTES = [
  { title: "Seller & buyer GSTIN", body: "Both stored verbatim on the invoice — a later change to the tenant profile must not alter an issued invoice." },
  { title: "State + state code (both parties)", body: "27 / 29 etc. The CGST/SGST-vs-IGST decision is derived from these, so they are frozen at issue." },
  { title: "Place of supply", body: "Drives inter- vs intra-state. On B2B it can differ from the buyer address (Ship To)." },
  { title: "Reverse-charge flag", body: "Yes/No per invoice — changes who remits the tax." },
  { title: "Per-line HSN/SAC + rate", body: "HSN and the GST rate applied to each line, not just the product master value at render time." },
  { title: "Per-slab tax split", body: "The rate-wise breakup (taxable, CGST, SGST, IGST per slab) is stored, not recomputed from lines." },
  { title: "Line & total discount", body: "Discount amounts as applied, so taxable value is reproducible." },
  { title: "Rounding policy + round-off", body: "The rounding rule and the resulting round-off amount are persisted so a re-render never drifts." },
  { title: "Snapshot version + issue date", body: "v1, issued date. Credit notes link to the original invoice number and its snapshot version." },
];

const MONO = "ui-monospace, 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

// ─── One invoice sheet (A4, print-ready) ────────────────────────────────────

export function InvoiceSheet({ m }: { m: InvoiceModel }) {
  const inter = m.taxKind === "INTER";
  const credit = m.docType === "CREDIT_NOTE";
  const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    padding: "5px 4px", borderRight: "1px solid #eef0f3", borderBottom: "1px solid #eef0f3", ...extra,
  });
  // column templates match the design per variant
  const lineCols = credit
    ? "26px minmax(140px,1fr) 50px 54px 66px 78px 46px 58px 46px 58px 74px"
    : inter
      ? "26px minmax(150px,1fr) 50px 54px 66px 50px 76px 56px 70px 74px"
      : "26px minmax(120px,1fr) 46px 50px 62px 46px 68px 40px 54px 40px 54px 66px";
  const headTint = credit ? "#fef2f2" : inter ? "#fff3ec" : "#f5f3ff";
  const headText = credit ? "#b91c1c" : inter ? "#c2410c" : "#55349A";
  const headBorder = credit ? "#f3c2c2" : inter ? "#f4c9ac" : "#d9cff0";
  const taxTint = credit ? "#fde3e3" : inter ? "#ffe8d9" : "#efe9fb";
  const hcell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    padding: "6px 4px", borderRight: `1px solid ${headBorder}`, borderBottom: `1px solid ${headBorder}`, ...extra,
  });

  return (
    <div className="dcinv-sheet" style={{ flex: "0 0 794px", width: 794, background: "#fff", border: `1px solid ${credit ? "#f4c9ac" : "#e5e7eb"}`, borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,.12)", color: "#1E1B4B" }}>
      {/* variant strip (screen only) */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: m.badgeTint, borderBottom: `1px solid ${credit ? "#fecaca" : "#ede9fe"}`, borderRadius: "4px 4px 0 0" }}>
        <span style={{ background: m.accent, color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "3px 8px" }}>{m.badge}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: m.accent }}>{m.badgeText}</span>
      </div>

      <div style={{ padding: "30px 34px 26px" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, borderBottom: `2px solid ${m.accent}`, paddingBottom: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.01em", color: credit ? m.accent : "#1E1B4B" }}>{m.title}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{m.subtitle}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11.5, lineHeight: 1.7 }}>
            {m.meta.map((r) => (
              <div key={r.label}>
                <span style={{ color: "#6B7280" }}>{r.label}&nbsp;</span>
                <span style={{ fontWeight: r.emphasise ? 700 : 600, color: r.emphasise ? "#EA580C" : undefined, fontFamily: /No\.|Invoice$/.test(r.label) ? MONO : undefined }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* parties */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #e5e7eb", borderTop: 0 }}>
          <PartyCell p={m.seller} borderRight />
          <PartyCell p={m.buyer} />
        </div>

        {/* line items */}
        <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", borderLeft: "1px solid #e5e7eb", fontSize: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: lineCols, background: headTint, color: headText, fontWeight: 700 }}>
            <div style={hcell({ textAlign: "center" })}>#</div>
            <div style={hcell({ padding: "6px 6px" })}>Description</div>
            <div style={hcell({ textAlign: "center" })}>HSN</div>
            <div style={hcell({ textAlign: "center" })}>Qty</div>
            <div style={hcell({ textAlign: "right" })}>Rate</div>
            {!credit && <div style={hcell({ textAlign: "right" })}>Disc</div>}
            <div style={hcell({ textAlign: "right" })}>Taxable</div>
            {inter ? (
              <>
                <div style={hcell({ textAlign: "center", background: taxTint })}>IGST%</div>
                <div style={hcell({ textAlign: "right", background: taxTint })}>IGST ₹</div>
              </>
            ) : (
              <>
                <div style={hcell({ textAlign: "center", background: taxTint, padding: "6px 3px" })}>CGST%</div>
                <div style={hcell({ textAlign: "right", background: taxTint, padding: "6px 3px" })}>CGST ₹</div>
                <div style={hcell({ textAlign: "center", background: taxTint, padding: "6px 3px" })}>SGST%</div>
                <div style={hcell({ textAlign: "right", background: taxTint, padding: "6px 3px" })}>SGST ₹</div>
              </>
            )}
            <div style={hcell({ textAlign: "right" })}>Total</div>
          </div>
          {m.lines.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: lineCols, color: "#334155" }}>
              <div style={cell({ textAlign: "center" })}>{l.sr}</div>
              <div style={cell({ padding: "5px 6px", fontWeight: 600, color: "#1E1B4B" })}>{l.desc}</div>
              <div style={cell({ textAlign: "center", fontFamily: MONO })}>{l.hsn}</div>
              <div style={cell({ textAlign: "center" })}>{l.qty}</div>
              <div style={cell({ textAlign: "right" })}>{l.rate}</div>
              {!credit && <div style={cell({ textAlign: "right", color: "#94a3b8" })}>{l.disc}</div>}
              <div style={cell({ textAlign: "right", fontWeight: 600, color: credit ? "#dc2626" : undefined })}>{l.taxable}</div>
              {inter ? (
                <>
                  <div style={cell({ textAlign: "center" })}>{l.irate}</div>
                  <div style={cell({ textAlign: "right" })}>{l.iamt}</div>
                </>
              ) : (
                <>
                  <div style={cell({ textAlign: "center", padding: "5px 3px" })}>{l.crate}</div>
                  <div style={cell({ textAlign: "right", padding: "5px 3px", color: credit ? "#dc2626" : undefined })}>{l.camt}</div>
                  <div style={cell({ textAlign: "center", padding: "5px 3px" })}>{l.srate}</div>
                  <div style={cell({ textAlign: "right", padding: "5px 3px", color: credit ? "#dc2626" : undefined })}>{l.samt}</div>
                </>
              )}
              <div style={cell({ textAlign: "right", fontWeight: 700, color: credit ? "#dc2626" : "#1E1B4B" })}>{l.total}</div>
            </div>
          ))}
        </div>

        {/* breakup + totals */}
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 16, marginTop: 14, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 5 }}>
              {credit ? "Rate-wise Tax Breakup (reversed)" : "Rate-wise Tax Breakup"}
            </div>
            <SlabTable m={m} inter={inter} />
          </div>
          <div style={{ fontSize: 11 }}>
            {m.totals.map((t) => (
              <div key={t.label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#475569", borderTop: t.dashedTop ? "1px dashed #e5e7eb" : undefined, marginTop: t.dashedTop ? 3 : undefined }}>
                <span>{t.label}</span><span>{t.value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", marginTop: 6, background: m.accent, color: "#fff", borderRadius: 6, fontWeight: 800, fontSize: 14 }}>
              <span>{m.grandLabel}</span><span>{m.grandValue}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#475569" }}>
              <span style={{ color: "#94a3b8" }}>Amount in words:&nbsp;</span>
              <span style={{ fontWeight: 600, fontStyle: "italic" }}>{m.amountInWords}</span>
            </div>
          </div>
        </div>

        {/* footer: QR / bank / signatory */}
        {credit ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, marginTop: 18, paddingTop: 14, borderTop: "1px solid #e5e7eb", alignItems: "end" }}>
            <div style={{ fontSize: 9.5, color: "#64748b", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: "#334155", marginBottom: 2 }}>Adjustment</div>
              <div>{m.adjustmentNote}</div>
            </div>
            <Signatory name={m.signatoryName || m.seller.name} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: m.showQr ? "auto 1fr auto" : "1fr auto", gap: 16, marginTop: 18, paddingTop: 14, borderTop: "1px solid #e5e7eb", alignItems: "end" }}>
            {m.showQr && (
              <div style={{ textAlign: "center" }}>
                {m.upiPayload ? (
                  <div style={{ width: 74, height: 74, border: "1px solid #cbd5e1", borderRadius: 6, padding: 5, background: "#fff" }}>
                    <QRCodeSVG value={m.upiPayload} size={62} level="M" bgColor="#ffffff" fgColor="#1E1B4B" />
                  </div>
                ) : (
                  <div style={{ width: 74, height: 74, border: "1px solid #cbd5e1", borderRadius: 6, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridTemplateRows: "repeat(7,1fr)", gap: 1, padding: 5, background: "#fff" }}>
                    {m.qr.map((c, i) => <span key={i} style={{ background: c, borderRadius: 1 }} />)}
                  </div>
                )}
                <div style={{ fontSize: 8.5, color: "#94a3b8", marginTop: 3 }}>Scan to pay · UPI</div>
              </div>
            )}
            <div style={{ fontSize: 9.5, color: "#64748b", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: "#334155", marginBottom: 2 }}>Terms &amp; Bank Details</div>
              {(m.bank ?? []).map((b, i) => <div key={i} style={i === (m.bank!.length - 1) ? { marginTop: 4 } : undefined}>{b}</div>)}
            </div>
            <Signatory name={m.signatoryName || m.seller.name} />
          </div>
        )}

        <div style={{ marginTop: 12, background: credit ? "#fef2f2" : "#f8fafc", border: `1px dashed ${credit ? "#fecaca" : "#cbd5e1"}`, borderRadius: 6, padding: "6px 10px", fontSize: 9, color: credit ? "#b91c1c" : "#64748b", textAlign: "center", fontFamily: MONO }}>
          {m.snapshotNote}
        </div>
      </div>
    </div>
  );
}

function PartyCell({ p, borderRight }: { p: Party; borderRight?: boolean }) {
  return (
    <div style={{ padding: "12px 14px", borderRight: borderRight ? "1px solid #e5e7eb" : undefined }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 5 }}>{p.label}</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
      <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.55, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: p.address }} />
      <div style={{ fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>
        {p.gstin && <div><span style={{ color: "#6B7280" }}>GSTIN:</span> <span style={{ fontWeight: 700, fontFamily: MONO, color: p.emphasiseGstin ? "#EA580C" : undefined }}>{p.gstin}</span></div>}
        {p.gstinNote && <div><span style={{ color: "#6B7280" }}>GSTIN:</span> <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{p.gstinNote}</span></div>}
        <div><span style={{ color: "#6B7280" }}>State:</span> <span style={{ fontWeight: 600 }}>{p.stateLine}</span></div>
        {(p.contactLines ?? []).map((c, i) => {
          const [k, ...rest] = c.split(": ");
          return <div key={i}><span style={{ color: "#6B7280" }}>{rest.length ? `${k}:` : ""}</span> {rest.length ? rest.join(": ") : k}</div>;
        })}
        {p.extraNote && <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 10 }}>{p.extraNote}</div>}
      </div>
    </div>
  );
}

function SlabTable({ m, inter }: { m: InvoiceModel; inter: boolean }) {
  const cols = inter ? "56px 1fr 1fr 1fr" : "56px 1fr 1fr 1fr 1fr";
  const th = (extra: React.CSSProperties = {}): React.CSSProperties => ({ padding: "4px 6px", borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", ...extra });
  const td = (extra: React.CSSProperties = {}): React.CSSProperties => ({ padding: "4px 6px", borderRight: "1px solid #eef0f3", borderBottom: "1px solid #eef0f3", ...extra });
  const totColor = m.docType === "CREDIT_NOTE" ? "#dc2626" : "#1E1B4B";
  return (
    <div style={{ borderTop: "1px solid #e5e7eb", borderLeft: "1px solid #e5e7eb", fontSize: 9.5 }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, background: "#f8fafc", color: "#64748b", fontWeight: 700 }}>
        <div style={th()}>Slab</div>
        <div style={th({ textAlign: "right" })}>Taxable</div>
        {inter ? <div style={th({ textAlign: "right" })}>IGST</div> : <><div style={th({ textAlign: "right" })}>CGST</div><div style={th({ textAlign: "right" })}>SGST</div></>}
        <div style={th({ textAlign: "right" })}>Total Tax</div>
      </div>
      {m.slabs.map((s, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: cols, color: "#334155" }}>
          <div style={td({ fontWeight: 600 })}>{s.slab}</div>
          <div style={td({ textAlign: "right" })}>{s.taxable}</div>
          {inter ? <div style={td({ textAlign: "right" })}>{s.igst}</div> : <><div style={td({ textAlign: "right" })}>{s.cgst}</div><div style={td({ textAlign: "right" })}>{s.sgst}</div></>}
          <div style={td({ textAlign: "right", fontWeight: 600 })}>{s.tax}</div>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: cols, background: "#f8fafc", fontWeight: 700, color: totColor }}>
        <div style={th()}>{m.slabTotal.slab}</div>
        <div style={th({ textAlign: "right" })}>{m.slabTotal.taxable}</div>
        {inter ? <div style={th({ textAlign: "right" })}>{m.slabTotal.igst}</div> : <><div style={th({ textAlign: "right" })}>{m.slabTotal.cgst}</div><div style={th({ textAlign: "right" })}>{m.slabTotal.sgst}</div></>}
        <div style={th({ textAlign: "right" })}>{m.slabTotal.tax}</div>
      </div>
    </div>
  );
}

function Signatory({ name }: { name?: string }) {
  return (
    <div style={{ textAlign: "right", fontSize: 10, color: "#475569" }}>
      <div style={{ height: 38 }} />
      <div style={{ borderTop: "1px solid #94a3b8", paddingTop: 4, width: 150, fontWeight: 600 }}>Authorised Signatory</div>
      {name && <div style={{ fontSize: 9, color: "#94a3b8" }}>for {name}</div>}
    </div>
  );
}

// ─── Page (chrome + variants + handoff notes) ───────────────────────────────

export function TaxInvoicePage() {
  const [dark, setDark] = useState(false);
  const t = {
    pageBg: dark ? "#0F0F13" : "#f8fafc",
    chromeText: dark ? "#F3F4F6" : "#0f172a",
    subText: dark ? "#9CA3AF" : "#64748b",
    chromeBorder: dark ? "#2D2D3A" : "#e2e8f0",
    chromeBtnBg: dark ? "#1F1F2A" : "#ffffff",
    panelBg: dark ? "#1A1A22" : "#ffffff",
    panelBorder: dark ? "#2D2D3A" : "#e5e7eb",
    noteBoxBg: dark ? "#1F1F2A" : "#f8fafc",
  };
  const btn: React.CSSProperties = { height: 38, padding: "0 14px", borderRadius: 8, border: `1px solid ${t.chromeBorder}`, background: t.chromeBtnBg, color: t.chromeText, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };

  return (
    <div className="dcinv-canvas" style={{ minHeight: "100vh", background: t.pageBg, padding: "24px 28px 64px", transition: "background .2s ease" }}>
      <style>{`
        @media print {
          .no-print { display:none !important; }
          .dcinv-canvas { background:#fff !important; padding:0 !important; }
          .dcinv-row { display:block !important; }
          .dcinv-sheet { box-shadow:none !important; border:none !important; margin:0 auto !important; page-break-after:always; }
          .dcinv-annotations { display:none !important; }
        }
      `}</style>

      {/* chrome */}
      <div className="no-print" style={{ maxWidth: 2560, margin: "0 auto 22px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ borderRadius: 6, background: "#f5f3ff", color: "#55349A", padding: "5px 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Karty</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em", color: t.chromeText }}>Tax Invoice</div>
            <div style={{ fontSize: 13, color: t.subText, marginTop: 2 }}>GST-compliant invoice template · three variants from one snapshot model</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setDark((d) => !d)} style={btn}><span>{dark ? "☀" : "☾"}</span>{dark ? "Light" : "Dark"}</button>
          <button style={{ ...btn, padding: "0 16px" }}>Send</button>
          <button onClick={() => window.print()} style={{ height: 38, padding: "0 18px", borderRadius: 8, border: 0, background: "#55349A", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}>Download PDF / Print</button>
        </div>
      </div>

      <div className="dcinv-row" style={{ maxWidth: 2560, margin: "0 auto", display: "flex", gap: 26, alignItems: "flex-start", overflowX: "auto", paddingBottom: 8 }}>
        <InvoiceSheet m={INVOICE_A} />
        <InvoiceSheet m={INVOICE_B} />
        <InvoiceSheet m={INVOICE_C} />

        {/* handoff notes (screen only) */}
        <div className="dcinv-annotations" style={{ flex: "0 0 340px", width: 340, position: "sticky", top: 24, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 14, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EA580C" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: t.chromeText }}>Tax snapshot — must persist</span>
          </div>
          <p style={{ fontSize: 11.5, color: t.subText, lineHeight: 1.5, margin: "0 0 14px" }}>Every field an issued invoice needs to be reproduced byte-for-byte. This UI renders a persisted snapshot only — it does no tax math.</p>
          {NOTES.map((n) => (
            <div key={n.title} style={{ borderTop: `1px solid ${t.panelBorder}`, padding: "9px 0" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: t.chromeText }}>{n.title}</div>
              <div style={{ fontSize: 11, color: t.subText, lineHeight: 1.5, marginTop: 2 }}>{n.body}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 12px", background: t.noteBoxBg, borderRadius: 8, fontSize: 10.5, color: t.subText, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: "#EA580C" }}>Rounding policy</span> is itself a persisted field — the round-off shown (−₹0.32 / +₹0.26) must be stored, not recomputed, so a re-render can never drift by a paisa.
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaxInvoicePage;
