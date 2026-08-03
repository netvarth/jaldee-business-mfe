export { cn } from "@jaldee/design-system";

export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function exportToCSV(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  options: { textColumns?: number[] } = {}
): void {
  const esc = (v: string | number) =>
    `"${(v === null || v === undefined ? "" : String(v)).replace(/"/g, '""')}"`;
  const textColumns = new Set(options.textColumns ?? []);
  const escCell = (value: string | number, columnIndex: number) => {
    const text = value === null || value === undefined ? "" : String(value);
    if (text && textColumns.has(columnIndex)) {
      return esc(`="${text.replace(/"/g, '""')}"`);
    }
    return esc(value);
  };
  const csv = [headers.map(esc).join(","), ...rows.map((row) => row.map(escCell).join(","))].join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
