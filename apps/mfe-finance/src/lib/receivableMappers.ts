import type { FinanceReceivable } from "./financeData";

export function normalizeReceivableRows(payload: any): FinanceReceivable[] {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.results)
            ? payload.results
            : [];

  return records.map((item: any, index: number) => {
    const providerConsumer = item?.providerConsumerDto;
    const customerName = providerConsumer?.firstName
      ? `${providerConsumer.firstName} ${providerConsumer.lastName ?? ""}`.trim()
      : String(item?.customerName || item?.consumerName || item?.payerName || item?.accountName || "");
    const paymentDate = item?.paymentOn || item?.paymentDate || item?.receivedDate || item?.createdDate;
    const invoiceNo = item?.invoiceNum || item?.receiptNum || item?.paymentLabel || item?.paymentRefId || "-";
    const reference = item?.referenceNo || "-";
    const invoiceCategory = item?.paymentCategory || item?.comingFromCategoryName || item?.purpose || "-";
    const status = item?.statusName || item?.gatewayStatus || "New";

    return {
      id: String(item?.paymentsInUid || item?.payInOutUid || item?.uid || item?.id || `receivable-${index}`),
      customer: customerName,
      invoiceId: String(invoiceNo),
      amountDue: Number(item?.amount || item?.paymentAmount || item?.receivedAmount || item?.netTotal || 0) || 0,
      ageing: String(paymentDate || "-"),
      owner: String(item?.createdByName || item?.userName || item?.owner || "Finance"),
      date: paymentDate ? new Date(paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
      revenueCategory: String(item?.categoryName || item?.paymentLabel || "-"),
      invoiceCategory: String(invoiceCategory),
      invoiceNo: String(invoiceNo),
      reference: String(reference),
      patientName: String(item?.consumerName || customerName || ""),
      vendor: String(item?.vendorName || item?.userName || "-"),
      location: String(item?.locationName || "-"),
      status: String(status),
    };
  });
}
