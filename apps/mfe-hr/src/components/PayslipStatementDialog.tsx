import { useMemo, useRef, type CSSProperties } from "react";
import { ArrowLeft, CheckCircle2, Printer, X } from "lucide-react";
import { Button, Dialog } from "@jaldee/design-system";
import { usePayslipDetails, type PayrollCustomField, type Payslip, type PayslipLine } from "../services/usePayrollData";
import type { Employee } from "../types";
import { HrPageHeader } from "./HrPageHeader";
import { formatCurrency, formatDate } from "../lib/utils";

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

function isGrossKey(key: string) {
  const norm = key.toLowerCase().replace(/[^a-z]/g, "");
  return norm === "gross" || norm === "grosspay" || norm === "grossearnings";
}

function payslipLineLabel(line: PayslipLine) {
  const code = normalizedDeductionKey(line.componentCode || "");
  const category = normalizedDeductionKey(line.componentCategory || "");
  if (code === "lop" || category === "lop") return "Loss of Pay";
  return displayLabel(line.componentName || line.componentCode || "-");
}

function isTotalDeductionKey(key: string) {
  const norm = key.toLowerCase().replace(/[^a-z]/g, "");
  return (
    norm === "total" ||
    norm === "subtotal" ||
    norm === "totaldeductions" ||
    norm === "totaldeduction" ||
    norm === "deductions" ||
    norm === "totalstatutorydeductions"
  );
}

function normalizedDeductionKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isTdsKey(key: string) {
  const norm = normalizedDeductionKey(key);
  return norm === "tds" || norm === "taxdeductedatsource";
}

function isLegacyTaxKey(key: string) {
  return normalizedDeductionKey(key) === "tax";
}

function formatDeductionLabel(label: string) {
  const norm = label.toLowerCase();
  if (norm.includes("employer")) {
    const cleanName = displayLabel(label.replace(/employer/i, "").trim());
    return `${cleanName} (Employer Contribution)`;
  }
  const cleanName = displayLabel(label);
  if (norm === "pf" || norm === "esi" || norm === "epf" || norm === "pt") {
    return `${cleanName} (Employee)`;
  }
  return cleanName;
}

function isEmployerContributionLabel(label: string) {
  return normalizedDeductionKey(label).includes("employer");
}

function resolveLineBuckets(payslip: Payslip) {
  const rawLines = payslip.lines || payslip.lineItems || [];
  const hasTdsLine = rawLines.some((line) => isTdsKey(line.componentCode || line.componentName || "") && (line.amount ?? 0) !== 0);
  const lines = hasTdsLine
    ? rawLines.filter((line) => !isLegacyTaxKey(line.componentCode || line.componentName || ""))
    : rawLines;
  const explicitEarnings = Object.entries(payslip.earnings || {});
  const rawExplicitDeductions = Object.entries(payslip.deductions || {});
  const hasExplicitTds = rawExplicitDeductions.some(([label, amount]) => isTdsKey(label) && (amount ?? 0) !== 0);
  const explicitDeductions = hasExplicitTds
    ? rawExplicitDeductions.filter(([label]) => !isLegacyTaxKey(label))
    : rawExplicitDeductions;

  if (explicitEarnings.length > 0 || explicitDeductions.length > 0) {
    const grossEntry = explicitEarnings.find(([label]) => isGrossKey(label));
    const explicitGrossVal = grossEntry ? grossEntry[1] : undefined;

    const totalDeductionEntry = explicitDeductions.find(([label]) => isTotalDeductionKey(label));
    const explicitTotalDeductionsVal = totalDeductionEntry ? totalDeductionEntry[1] : undefined;

    return {
      earnings: explicitEarnings
        .filter(([label, amount]) => (amount ?? 0) !== 0 && !isGrossKey(label))
        .map(([label, amount]) => [displayLabel(label), amount] as const),
      deductions: explicitDeductions
        .filter(([label, amount]) => (amount ?? 0) !== 0 && !isTotalDeductionKey(label))
        .map(([label, amount]) => [formatDeductionLabel(label), amount] as const),
      lines: lines.filter((line) => (line.amount ?? 0) !== 0),
      explicitGrossVal,
      explicitTotalDeductionsVal,
    };
  }

  const grossLine = lines.find((line) => isGrossKey(line.componentName || line.componentCode || ""));
  const explicitGrossVal = grossLine ? grossLine.amount : undefined;

  const totalDeductionLine = lines.find((line) => isTotalDeductionKey(line.componentName || line.componentCode || ""));
  const explicitTotalDeductionsVal = totalDeductionLine ? totalDeductionLine.amount : undefined;

  const earnings = lines
    .filter((line) => line.componentType !== "DEDUCTION" && (line.amount ?? 0) !== 0 && !isGrossKey(line.componentName || line.componentCode || ""))
    .map((line) => [payslipLineLabel(line), line.amount ?? 0] as const);
  const deductions = lines
    .filter((line) => line.componentType === "DEDUCTION" && (line.amount ?? 0) !== 0 && !isTotalDeductionKey(line.componentName || line.componentCode || ""))
    .map((line) => [formatDeductionLabel(payslipLineLabel(line)), line.amount ?? 0] as const);

  return { earnings, deductions, lines: lines.filter((line) => (line.amount ?? 0) !== 0), explicitGrossVal, explicitTotalDeductionsVal };
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

function firstNumericTotal(...values: unknown[]) {
  let zeroValue: number | undefined;
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) continue;
    if (numeric !== 0) return numeric;
    zeroValue = numeric;
  }
  return zeroValue;
}

export function PayslipStatementView({
  payslip,
  employeeName,
  employee,
  fields = [],
}: {
  payslip: Payslip;
  employeeName?: string;
  employee?: Employee | null;
  fields?: PayrollCustomField[];
}) {
  const printRootRef = useRef<HTMLDivElement | null>(null);
  const bucketData = resolveLineBuckets(payslip);
  const isIntern = employee?.employmentType?.toLowerCase() === "intern";
  const isPfEntry = (label: string) => /\bpf\b|provident\s*fund/i.test(label);
  const visibleDeductions = isIntern
    ? bucketData.deductions.filter(([label]) => !isPfEntry(label))
    : bucketData.deductions;
  const employeeDeductionEntries = visibleDeductions.filter(([label]) => !isEmployerContributionLabel(label));
  const employerContributionEntries = visibleDeductions.filter(([label]) => isEmployerContributionLabel(label));
  const sumEarnings = bucketData.earnings.reduce((sum, [, amount]) => sum + Math.abs(amount), 0);
  const payslipRecord = payslip as Payslip & Record<string, unknown>;
  const computedGross = firstNumericTotal(
    payslip.grossPay,
    payslip.grossEarnings,
    payslip.totalEarnings,
    payslipRecord.gross,
  );
  const gross = computedGross != null && computedGross !== 0
    ? Math.abs(computedGross)
    : bucketData.explicitGrossVal != null && bucketData.explicitGrossVal !== 0
      ? Math.abs(bucketData.explicitGrossVal)
      : sumEarnings;

  const employeeDeductionSum = employeeDeductionEntries
    .filter(([label]) => !isTotalDeductionKey(label))
    .reduce((sum, [, amount]) => sum + Math.abs(amount), 0);
  const employerContributionTotal = employerContributionEntries.reduce((sum, [, amount]) => sum + Math.abs(amount), 0);

  const computedDeductions = firstNumericTotal(
    payslip.totalDeductions,
    payslip.totalDeduction,
    payslip.deductionTotal,
    payslipRecord.employeeDeductions,
  );
  const deductions = computedDeductions != null && computedDeductions !== 0
    ? Math.abs(computedDeductions)
    : bucketData.explicitTotalDeductionsVal != null && bucketData.explicitTotalDeductionsVal !== 0
      ? Math.abs(bucketData.explicitTotalDeductionsVal)
      : employeeDeductionSum;
  const net = payslip.netPay ?? gross - deductions;
  const payslipId = payslip.id || payslip.uid || "-";

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
            html, body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: Arial, sans-serif;
              color: #1f2937;
              font-size: 12px;
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
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            @page {
              size: A4 portrait;
              margin: 5mm;
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

  const validCustomFields = fields.filter((field) => {
    const raw = payslip.customFieldsJson?.[field.fieldKey] ?? field.defaultValue;
    if (raw === undefined || raw === null) return false;
    const str = String(raw).trim();
    return str !== "" && str !== "-";
  });
  const company = payslip.companyProfile;
  const companyAddress = [company?.addressLine, company?.city, company?.state, company?.country].filter(Boolean).join(", ");
  const companyContact = [company?.phone ? `Phone: ${company.phone}` : "", company?.email ? `Email: ${company.email}` : ""].filter(Boolean).join(" | ");

  return (
    <div ref={printRootRef} data-payslip-print-root style={shell}>
      <div style={topAccent} />
      <div style={headerBlock}>
        <div style={{ display: "grid", gap: 2, alignContent: "start", alignSelf: "start" }}>
          <div style={brand}>{company?.name || company?.legalName || "Company"}</div>
          {company?.legalName && company.legalName !== company.name && <div style={metaText}>{company.legalName}</div>}
          {companyAddress && <div style={metaText}>{companyAddress}</div>}
          {companyContact && <div style={metaText}>{companyContact}</div>}
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
          {validCustomFields.map((field) => {
            const val = String(payslip.customFieldsJson?.[field.fieldKey] ?? field.defaultValue).trim();
            return <InfoPair key={field.id} label={field.fieldLabel} value={val} />;
          })}
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
            entries={employeeDeductionEntries}
            totalLabel="Total Employee Deductions (B)"
            totalValue={deductions}
            tone="negative"
          />
          {employerContributionEntries.length > 0 && (
            <StatementColumn
              title="3. Employer Contributions"
              amountLabel="Amount (INR)"
              entries={employerContributionEntries}
              totalLabel="Total Employer Contributions"
              totalValue={employerContributionTotal}
              tone="positive"
            />
          )}
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
                      <td style={detailCellStrong}>{payslipLineLabel(line)}</td>
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
        <Button id="hr-payroll-payslip-print" data-testid="hr-payroll-payslip-print" variant="outline" size="md" icon={<Printer size={16} />} onClick={printStatement}>
          Print Payslip
        </Button>
      </div>
    </div>
  );
}

export function PayslipStatementPage({
  payslip,
  employeeName,
  employee,
  fields = [],
  onBack,
}: {
  payslip: Payslip;
  employeeName?: string;
  employee?: Employee | null;
  fields?: PayrollCustomField[];
  onBack: () => void;
}) {
  const payslipUid = payslip.uid || payslip.id;
  const { lines, loading } = usePayslipDetails(payslipUid);

  const fullPayslip: Payslip = useMemo(() => {
    if (lines.length > 0) {
      return { ...payslip, lines, lineItems: lines };
    }
    return payslip;
  }, [payslip, lines]);

  return (
    <div className="space-y-6 flex flex-col min-h-[calc(100vh-6rem)]">
      <HrPageHeader
        title="Payslip Statement"
        subtitle={`Statement ID: ${payslip.id || payslip.uid || "-"}`}
        back="/payroll/payslips"
        onNavigate={onBack}
        actions={
          <div className="flex items-center gap-2">
            {loading && <span className="text-xs text-teal-700 animate-pulse font-medium">Fetching lines from API…</span>}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {payslip.status || "Generated"}
            </span>
          </div>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden flex-1 flex flex-col">
        <PayslipStatementView
          payslip={fullPayslip}
          employee={employee}
          fields={fields}
          employeeName={employeeName}
        />
      </div>
    </div>
  );
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
  return (
    <Dialog
      open={!!payslip}
      onClose={onClose}
      hideHeader
      contentClassName="w-[calc(100vw-1rem)] max-w-[980px] max-h-[calc(100vh-1rem)] overflow-y-auto p-0"
    >
      {payslip ? (
        <div style={{ position: "relative" }}>
          <PayslipStatementView
            payslip={payslip}
            employee={employee}
            fields={fields}
            employeeName={employeeName}
          />
          <button id="hr-payroll-payslip-dialog-close" data-testid="hr-payroll-payslip-dialog-close" data-print-hidden aria-label="Close" onClick={onClose} style={closeButton}>
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
  width: "100%",
  minHeight: "100%",
  display: "flex",
  flexDirection: "column",
  background: "var(--surface-bg)",
  color: "var(--dark-text)",
};
const topAccent: CSSProperties = {
  height: 4,
  background: "linear-gradient(90deg, #0b7a75 0%, #0d5b56 100%)",
};
const headerBlock: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  padding: "20px 24px",
  width: "100%",
};
const brand: CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: "#0d5b56",
  lineHeight: 1,
};
const title: CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#1f3147",
};
const metaText: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  lineHeight: 1.2,
};
const headerMetaGrid: CSSProperties = {
  display: "grid",
  gap: 4,
};
const metaLabel: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
};
const metaValue: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#334155",
};
const sectionDivider: CSSProperties = {
  borderTop: "1px solid color-mix(in srgb, var(--border-color) 80%, white)",
};
const contentBlock: CSSProperties = {
  padding: "20px 24px",
  width: "100%",
  flex: 1,
};
const sectionHeading: CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#0d5b56",
  marginBottom: 10,
};
const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 18,
  width: "100%",
};
const infoPair: CSSProperties = {
  display: "grid",
  gap: 2,
};
const infoLabel: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
};
const infoValue: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  wordBreak: "break-word",
};
const twoColumnStatement: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 0,
  width: "100%",
  border: "1px solid color-mix(in srgb, var(--border-color) 74%, white)",
  borderRadius: 12,
  overflow: "hidden",
};
const statementColumn: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "14px 16px",
  background: "white",
  minHeight: 180,
};
const columnHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "baseline",
  borderBottom: "1px solid color-mix(in srgb, var(--border-color) 66%, white)",
  paddingBottom: 6,
};
const columnTitlePositive: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#0d5b56",
};
const columnTitleNegative: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#ff2a5f",
};
const amountHead: CSSProperties = {
  fontSize: 9,
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
  fontSize: 12,
  color: "#475569",
};
const rowAmountPositive: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#1f3147",
  whiteSpace: "nowrap",
};
const rowAmountNegative: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#ff2a5f",
  whiteSpace: "nowrap",
};
const emptyColumnText: CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
};
const columnTotal: CSSProperties = {
  marginTop: "auto",
  paddingTop: 8,
  borderTop: "1px solid color-mix(in srgb, var(--border-color) 66%, white)",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};
const totalLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#334155",
};
const totalPositive: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#0d7a75",
};
const totalNegative: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#ff2a5f",
};
const detailTableWrap: CSSProperties = {
  overflowX: "auto",
  border: "1px solid color-mix(in srgb, var(--border-color) 74%, white)",
  borderRadius: 10,
};
const detailTable: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
};
const detailHead: CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#94a3b8",
  borderBottom: "1px solid color-mix(in srgb, var(--border-color) 66%, white)",
};
const detailCell: CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};
const customFieldCard: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid color-mix(in srgb, var(--border-color) 74%, white)",
  background: "white",
};
const customFieldLabel: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
  marginBottom: 4,
};
const customFieldValue: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
};
const netBand: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
  alignItems: "end",
  padding: "14px 20px",
  background: "#063c38",
  marginTop: "auto",
};
const netBandLabel: CSSProperties = {
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#65d6cf",
  marginBottom: 4,
};
const netBandValue: CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  lineHeight: 1,
  color: "white",
};
const netBandWords: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "white",
};
const footerNote: CSSProperties = {
  padding: "10px 20px",
  textAlign: "center",
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "#94a3b8",
};
const footerActions: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "0 20px 16px",
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
