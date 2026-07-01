import { useRef, type CSSProperties } from "react";
import { CheckCircle2, Printer, X } from "lucide-react";
import { Button, Dialog } from "@jaldee/design-system";
import type { PayrollCustomField, Payslip, PayslipLine } from "../services/usePayrollData";
import type { Employee } from "../types";
import { formatCurrency, formatDate } from "../lib/utils";

const COMPANY_NAME = "JALDEE HR";
const COMPANY_LEGAL = "Jaldee Technologies Pvt. Ltd.";
const COMPANY_ADDRESS = "Building 4B, Infopark, Kakkanad, Kochi, Kerala - 682030";
const COMPANY_CONTACT = "Phone: +91 484 2748301 | Email: accounts@jaldee.com";

function labelize(value?: string) {
  return value ? value.replaceAll("_", " ") : "-";
}

function displayLabel(value?: string) {
  if (!value) return "-";
  const normalized = value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
  const tokenMap: Record<string, string> = {
    hra: "HRA",
    tds: "TDS",
    pf: "PF",
    epf: "EPF",
    esi: "ESI",
    pt: "PT",
    lop: "LOP",
    uan: "UAN",
    ifsc: "IFSC",
  };
  return normalized
    .split(/\s+/)
    .map((token) => tokenMap[token.toLowerCase()] || `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`)
    .join(" ");
}

function resolveLineBuckets(payslip: Payslip) {
  const lines = payslip.lines || payslip.lineItems || [];
  const explicitEarnings = Object.entries(payslip.earnings || {});
  const explicitDeductions = Object.entries(payslip.deductions || {});

  if (explicitEarnings.length > 0 || explicitDeductions.length > 0) {
    return {
      earnings: explicitEarnings
        .filter(([, amount]) => (amount ?? 0) !== 0)
        .map(([label, amount]) => [displayLabel(label), amount] as const),
      deductions: explicitDeductions
        .filter(([, amount]) => (amount ?? 0) !== 0)
        .map(([label, amount]) => [displayLabel(label), amount] as const),
      lines: lines.filter((line) => (line.amount ?? 0) !== 0),
    };
  }

  const earnings = lines
    .filter((line) => line.componentType !== "DEDUCTION" && (line.amount ?? 0) !== 0)
    .map((line) => [displayLabel(line.componentName || line.componentCode || "-"), line.amount ?? 0] as const);
  const deductions = lines
    .filter((line) => line.componentType === "DEDUCTION" && (line.amount ?? 0) !== 0)
    .map((line) => [displayLabel(line.componentName || line.componentCode || "-"), line.amount ?? 0] as const);

  return { earnings, deductions, lines: lines.filter((line) => (line.amount ?? 0) !== 0) };
}

function fieldValue(value?: string | null) {
  return value && String(value).trim() ? String(value) : "N/A";
}

function summaryValue(value?: number) {
  return formatCurrency(value ?? 0);
}

function amountInWords(value: number) {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const chunk = (n: number): string => {
    if (n < 20) return units[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${units[n % 10]}` : ""}`;
    return `${units[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${chunk(n % 100)}` : ""}`;
  };
  const integer = Math.round(Math.abs(value));
  if (integer === 0) return "Zero Rupees Only";
  const crore = Math.floor(integer / 10000000);
  const lakh = Math.floor((integer % 10000000) / 100000);
  const thousand = Math.floor((integer % 100000) / 1000);
  const hundred = integer % 1000;
  const parts = [
    crore ? `${chunk(crore)} Crore` : "",
    lakh ? `${chunk(lakh)} Lakh` : "",
    thousand ? `${chunk(thousand)} Thousand` : "",
    hundred ? chunk(hundred) : "",
  ].filter(Boolean);
  return `${parts.join(" ")} Rupees Only`;
}

function lineAmount(line: PayslipLine) {
  return line.amount ?? 0;
}

export function PayslipStatementDialog({
  payslip,
  employeeName,
  employee,
  fields = [],
  onClose,
}: {
  payslip: Payslip | null;
  employeeName?: string;
  employee?: Employee | null;
  fields?: PayrollCustomField[];
  onClose: () => void;
}) {
  const printRootRef = useRef<HTMLDivElement | null>(null);
  const bucketData = payslip ? resolveLineBuckets(payslip) : { earnings: [], deductions: [], lines: [] };
  const gross = payslip?.grossPay ?? bucketData.earnings.reduce((sum, [, amount]) => sum + amount, 0);
  const deductions = payslip?.totalDeductions ?? bucketData.deductions.reduce((sum, [, amount]) => sum + amount, 0);
  const net = payslip?.netPay ?? gross - deductions;
  const payslipId = payslip?.id || payslip?.uid || "-";
  const printStatement = () => {
    if (typeof window === "undefined" || !printRootRef.current) return;
    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Payslip Statement</title>
          <style>
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: white;
              font-family: Arial, sans-serif;
              color: #1f2937;
            }
            [data-print-hidden] { display: none !important; }
            [data-payslip-print-root] {
              width: 100%;
              max-width: none;
              margin: 0;
              border-radius: 0;
              box-shadow: none;
              overflow: visible;
              background: white;
            }
            @page {
              size: auto;
              margin: 10mm;
            }
          </style>
        </head>
        <body>${printRootRef.current.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog
      open={!!payslip}
      onClose={onClose}
      hideHeader
      contentClassName="w-[calc(100vw-1rem)] max-w-[980px] max-h-[calc(100vh-1rem)] overflow-y-auto p-0"
    >
      {payslip ? (
        <div ref={printRootRef} data-payslip-print-root style={shell}>
          <div style={topAccent} />
          <div style={headerBlock}>
            <div style={{ display: "grid", gap: 2, alignContent: "start", alignSelf: "start" }}>
              <div style={brand}>{COMPANY_NAME}</div>
              <div style={metaText}>{COMPANY_LEGAL}</div>
              <div style={metaText}>{COMPANY_ADDRESS}</div>
              <div style={metaText}>{COMPANY_CONTACT}</div>
            </div>
            <div style={{ display: "grid", gap: 6, textAlign: "right" }}>
              <div style={title}>Payslip Statement</div>
              <div style={headerMetaGrid}>
                <StatementMeta label="ID" value={payslipId} />
                <StatementMeta label="Month" value={payslip.monthStr || payslip.month || "-"} />
                <StatementMeta label="Generated" value={formatDate(payslip.generatedAt)} />
                <StatementMeta label="Status" value={payslip.status || "Generated"} />
              </div>
            </div>
          </div>

          <div style={sectionDivider} />

          <div style={contentBlock}>
            <div style={sectionHeading}>Employee Statutory & Bank Information</div>
            <div style={infoGrid}>
              <InfoPair label="Employee Name" value={employee?.name || payslip.employeeName || employeeName || "-"} />
              <InfoPair label="Date Of Joining (DOJ)" value={formatDate(employee?.doj)} />
              <InfoPair label="Bank Name" value={fieldValue(employee?.bankDetails?.bankName)} />
              <InfoPair label="Employee ID" value={employee?.employeeId || payslip.employeeUid || "-"} />
              <InfoPair label="Permanent A/C No. (PAN)" value={fieldValue((employee as Record<string, unknown> | undefined)?.pan as string | undefined)} />
              <InfoPair label="Bank Account Number" value={fieldValue(employee?.bankDetails?.accountNumber)} />
              <InfoPair label="Designation" value={employee?.designation || "-"} />
              <InfoPair label="Universal Account No. (UAN)" value={fieldValue((employee as Record<string, unknown> | undefined)?.uan as string | undefined)} />
              <InfoPair label="IFSC Financial Code" value={fieldValue(employee?.bankDetails?.ifscCode)} />
              <InfoPair label="Department" value={employee?.department || "-"} />
              <InfoPair label="Paid / LOP" value={payslip.status || "Processed"} />
              <InfoPair label="Net Transfer" value={summaryValue(net)} />
            </div>

            <div style={twoColumnStatement}>
              <StatementColumn
                title="1. Earning Allowances"
                amountLabel="Amount (INR)"
                entries={bucketData.earnings}
                totalLabel="Gross Earnings (A)"
                totalValue={gross}
                tone="positive"
              />
              <StatementColumn
                title="2. Statutory Deductions"
                amountLabel="Amount (INR)"
                entries={bucketData.deductions}
                totalLabel="Total Deductions (B)"
                totalValue={deductions}
                tone="negative"
              />
            </div>

            {bucketData.lines.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={sectionHeading}>Detailed Line Snapshots</div>
                <div style={detailTableWrap}>
                  <table style={detailTable}>
                    <thead>
                      <tr>
                        <th style={detailHead}>Component</th>
                        <th style={detailHead}>Type</th>
                        <th style={detailHead}>Calculation</th>
                        <th style={{ ...detailHead, textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucketData.lines.map((line, index) => (
                        <tr key={line.uid || line.id || index}>
                          <td style={detailCellStrong}>{displayLabel(line.componentName || line.componentCode || "-")}</td>
                          <td style={detailCell}>{labelize(line.componentType)}</td>
                          <td style={detailCell}>{labelize(line.calculationType)}</td>
                          <td style={{ ...detailCellStrong, textAlign: "right" }}>{summaryValue(lineAmount(line))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {fields.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={sectionHeading}>Custom Fields</div>
                <div style={customFieldGrid}>
                  {fields.map((field) => (
                    <div key={field.id} style={customFieldCard}>
                      <div style={customFieldLabel}>{field.fieldLabel}</div>
                      <div style={customFieldValue}>{String(payslip.customFieldsJson?.[field.fieldKey] ?? field.defaultValue ?? "-")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={netBand}>
            <div>
              <div style={netBandLabel}>Net Pay Transferred To Account (A - B)</div>
              <div style={netBandValue}>{summaryValue(net)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={netBandLabel}>Amount In Words (INR)</div>
              <div style={netBandWords}>{amountInWords(net)}</div>
            </div>
          </div>

          <div style={footerNote}>
            This is a computer-generated payslip statement issued under Jaldee HR and does not require a physical signature.
          </div>

          <div data-print-hidden style={footerActions}>
            <Button variant="outline" size="md" icon={<Printer size={16} />} onClick={printStatement}>
              Print Payslip
            </Button>
            <Button variant="primary" size="md" icon={<CheckCircle2 size={16} />} onClick={onClose}>
              Done
            </Button>
          </div>

          <button data-print-hidden aria-label="Close" onClick={onClose} style={closeButton}>
            <X size={18} />
          </button>
        </div>
      ) : null}
    </Dialog>
  );
}

function StatementMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={metaLabel}>{label}</div>
      <div style={metaValue}>{value}</div>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoPair}>
      <div style={infoLabel}>{label}</div>
      <div style={infoValue}>{value}</div>
    </div>
  );
}

function StatementColumn({
  title,
  amountLabel,
  entries,
  totalLabel,
  totalValue,
  tone,
}: {
  title: string;
  amountLabel: string;
  entries: ReadonlyArray<readonly [string, number]>;
  totalLabel: string;
  totalValue: number;
  tone: "positive" | "negative";
}) {
  return (
    <div style={statementColumn}>
      <div style={columnHeader}>
        <div style={tone === "positive" ? columnTitlePositive : columnTitleNegative}>{title}</div>
        <div style={amountHead}>{amountLabel}</div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {entries.length === 0 ? (
          <div style={emptyColumnText}>No entries available.</div>
        ) : (
          entries.map(([label, amount]) => (
            <div key={label} style={rowLine}>
              <span style={rowLabel}>{label}</span>
              <strong style={tone === "positive" ? rowAmountPositive : rowAmountNegative}>
                {tone === "negative" ? "-" : ""}{summaryValue(Math.abs(amount))}
              </strong>
            </div>
          ))
        )}
      </div>
      <div style={columnTotal}>
        <span style={totalLabelStyle}>{totalLabel}</span>
        <strong style={tone === "positive" ? totalPositive : totalNegative}>
          {tone === "negative" ? "-" : ""}{summaryValue(Math.abs(totalValue))}
        </strong>
      </div>
    </div>
  );
}

const shell: CSSProperties = {
  position: "relative",
  background: "var(--surface-bg)",
  color: "var(--dark-text)",
};
const topAccent: CSSProperties = {
  height: 6,
  background: "linear-gradient(90deg, #0b7a75 0%, #0d5b56 100%)",
};
const headerBlock: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
  padding: 24,
};
const brand: CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  color: "#0d5b56",
  lineHeight: 1,
};
const title: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#1f3147",
};
const metaText: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.25,
};
const headerMetaGrid: CSSProperties = {
  display: "grid",
  gap: 8,
};
const metaLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
};
const metaValue: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
};
const sectionDivider: CSSProperties = {
  borderTop: "1px solid color-mix(in srgb, var(--border-color) 80%, white)",
};
const contentBlock: CSSProperties = {
  padding: 24,
};
const sectionHeading: CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#0d5b56",
  marginBottom: 16,
};
const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 24,
};
const infoPair: CSSProperties = {
  display: "grid",
  gap: 4,
};
const infoLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
};
const infoValue: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
  wordBreak: "break-word",
};
const twoColumnStatement: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 0,
  border: "1px solid color-mix(in srgb, var(--border-color) 74%, white)",
  borderRadius: 16,
  overflow: "hidden",
};
const statementColumn: CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 20,
  background: "white",
  minHeight: 260,
};
const columnHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "baseline",
  borderBottom: "1px solid color-mix(in srgb, var(--border-color) 66%, white)",
  paddingBottom: 10,
};
const columnTitlePositive: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#0d5b56",
};
const columnTitleNegative: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#ff2a5f",
};
const amountHead: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
};
const rowLine: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};
const rowLabel: CSSProperties = {
  fontSize: 13,
  color: "#475569",
};
const rowAmountPositive: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#1f3147",
  whiteSpace: "nowrap",
};
const rowAmountNegative: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#ff2a5f",
  whiteSpace: "nowrap",
};
const emptyColumnText: CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
};
const columnTotal: CSSProperties = {
  marginTop: "auto",
  paddingTop: 14,
  borderTop: "1px solid color-mix(in srgb, var(--border-color) 66%, white)",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};
const totalLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#334155",
};
const totalPositive: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: "#0d7a75",
};
const totalNegative: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: "#ff2a5f",
};
const detailTableWrap: CSSProperties = {
  overflowX: "auto",
  border: "1px solid color-mix(in srgb, var(--border-color) 74%, white)",
  borderRadius: 14,
};
const detailTable: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
};
const detailHead: CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#94a3b8",
  borderBottom: "1px solid color-mix(in srgb, var(--border-color) 66%, white)",
};
const detailCell: CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: "#475569",
  borderBottom: "1px solid color-mix(in srgb, var(--border-color) 50%, white)",
};
const detailCellStrong: CSSProperties = {
  ...detailCell,
  fontWeight: 700,
  color: "#1f3147",
};
const customFieldGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const customFieldCard: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid color-mix(in srgb, var(--border-color) 74%, white)",
  background: "white",
};
const customFieldLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
  marginBottom: 6,
};
const customFieldValue: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
};
const netBand: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
  alignItems: "end",
  padding: "20px 24px",
  background: "#063c38",
};
const netBandLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#65d6cf",
  marginBottom: 8,
};
const netBandValue: CSSProperties = {
  fontSize: 44,
  fontWeight: 900,
  lineHeight: 1,
  color: "white",
};
const netBandWords: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "white",
};
const footerNote: CSSProperties = {
  padding: "14px 24px",
  textAlign: "center",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
};
const footerActions: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  padding: "0 24px 24px",
  flexWrap: "wrap",
};
const closeButton: CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "1px solid color-mix(in srgb, var(--border-color) 72%, white)",
  background: "white",
  color: "#475569",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "var(--shadow-sm)",
};
