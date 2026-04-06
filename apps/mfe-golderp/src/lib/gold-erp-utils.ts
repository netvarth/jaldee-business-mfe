import {
  JewelleryItem,
  JewelleryTag,
  Metal,
  MetalPurity,
  OldGoldExchange,
  SalesDiscount,
  SalesOrder,
  SalesOrderLine,
  StockTransfer,
} from "@/lib/gold-erp-types";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatWeight(grams: number) {
  return `${(Number(grams) || 0).toFixed(3).replace(/\.?0+$/, "")}g`;
}

export function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function toApiDateTime(value?: string | Date) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  const pad = (input: number) => String(Math.trunc(Math.abs(input))).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetMins = pad(Math.abs(offsetMinutes) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${sign}${offsetHours}${offsetMins}`;
}

export function downloadTextFile(contents: string, fileName: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  downloadBlob(blob, fileName);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function getGoldErpAssetUrl(fileName: "noData.png" | "noChartData.png" |"analytics.gif") {
  return new URL(`assets/images/menu/${fileName}`, document.baseURI).toString();
}

export function buildCsvFromRows(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return "";
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const escapeValue = (value: unknown) => {
    const normalized =
      value === null || value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const lines = [
    headers.map(escapeValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(",")),
  ];

  return lines.join("\n");
}

export function flattenExportRows(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((row, index) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return row as Record<string, unknown>;
    }

    return {
      index: index + 1,
      value: row,
    };
  });
}

export function downloadPdfDocument(title: string, rows: Record<string, unknown>[]) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    return;
  }

  const html = buildHtmlTableMarkup(title, rows);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function buildHtmlTableMarkup(title: string, rows: Record<string, unknown>[]) {
  const headers = rows.length
    ? Array.from(
        rows.reduce((set, row) => {
          Object.keys(row).forEach((key) => set.add(key));
          return set;
        }, new Set<string>()),
      )
    : [];

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headerMarkup = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyMarkup = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d4d4d8; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f4f4f5; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table>
    <thead><tr>${headerMarkup}</tr></thead>
    <tbody>${bodyMarkup}</tbody>
  </table>
</body>
</html>`;
}

export function downloadWordDocument(title: string, rows: Record<string, unknown>[]) {
  const html = buildHtmlTableMarkup(title, rows);
  downloadTextFile(html, `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.doc`, "application/msword");
}

export function downloadExcelDocument(title: string, rows: Record<string, unknown>[]) {
  const html = buildHtmlTableMarkup(title, rows);
  downloadTextFile(html, `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xls`, "application/vnd.ms-excel");
}

export function getMetalDisplayName(metal?: Partial<Metal>) {
  return metal?.name || metal?.metalCode || "—";
}

export function getPurityDisplayName(purity?: Partial<MetalPurity | JewelleryItem>) {
  return purity?.purityLabel || "-";
}

export function getItemId(item?: Partial<JewelleryItem> | null) {
  return item?.itemUid || "";
}

export function getTagId(tag?: Partial<JewelleryTag> | null) {
  return tag?.tagUid || "";
}

export function summarizeInventory(tags: JewelleryTag[] = [], items: JewelleryItem[] = []) {
  const inStock = tags.filter((tag) => tag.status === "IN_STOCK");
  const byType = items.reduce<Record<string, { count: number; weight: number; value: number }>>((acc, item) => {
    const itemTags = inStock.filter((tag) => tag.itemUid === item.itemUid);
    if (!itemTags.length) {
      return acc;
    }

    acc[item.itemType] = acc[item.itemType] || { count: 0, weight: 0, value: 0 };
    acc[item.itemType].count += itemTags.length;
    acc[item.itemType].weight += itemTags.reduce((sum, tag) => sum + (tag.netWt || 0), 0);
    acc[item.itemType].value += itemTags.reduce((sum, tag) => sum + (tag.sellingPrice || 0), 0);
    return acc;
  }, {});

  return Object.entries(byType).map(([category, value]) => ({
    category,
    count: value.count,
    mass: formatWeight(value.weight),
    value: value.value,
  }));
}

export function calculateOrderTotals(order?: Partial<SalesOrder>) {
  const lines = (order?.lines || []) as SalesOrderLine[];
  const lineTotal = lines.reduce((sum, line) => sum + (line.finalPrice ?? line.sellingPrice ?? 0), 0);
  const oldGoldEntries = (order?.oldGoldEntries || []) as OldGoldExchange[];
  const oldGoldTotal = oldGoldEntries.reduce((sum, entry) => sum + (entry.exchangeValue || 0), 0);
  const advances = order?.advances || [];
  const advanceTotal = advances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
  const discounts = (order?.discounts || []) as SalesDiscount[];
  const discountTotal = discounts.reduce((sum, discount) => sum + (discount.discountAmount || 0), 0);
  const payable = Math.max(0, lineTotal - oldGoldTotal - advanceTotal - discountTotal);

  return {
    lineTotal,
    oldGoldTotal,
    advanceTotal,
    discountTotal,
    payable,
  };
}

export function getTransferItemCount(transfer?: Partial<StockTransfer>) {
  return transfer?.lines?.length || 0;
}
