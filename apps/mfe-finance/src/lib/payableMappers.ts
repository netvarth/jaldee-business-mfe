import type { FinancePayable } from "./financeData";

export function normalizePayableRows(payload: any): FinancePayable[] {
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
    const vendorName = providerConsumer?.firstName
      ? `${providerConsumer.firstName} ${providerConsumer.lastName ?? ""}`.trim()
      : String(item?.vendorName || item?.consumerName || item?.payerName || item?.accountName || "-");
    const paymentDate = item?.paymentOn || item?.paymentDate || item?.receivedDate || item?.createdDate;
    const amount = Number(item?.amount || item?.paymentAmount || item?.receivedAmount || item?.netTotal || 0) || 0;
    const patientName = String(item?.consumerName || "-");
    const reference = String(item?.referenceNo || "-");
    const payoutCategory = String(item?.paymentCategory || item?.categoryName || "-");
    const expenseCategory = String(item?.comingFromCategoryName || "-");
    const status = String(item?.statusName || item?.gatewayStatus || "-");
    const location = String(item?.locationName || "-");

    return {
      id: String(item?.paymentsOutUid || item?.payInOutUid || item?.uid || item?.id || `payable-${index}`),
      vendor: vendorName,
      billRef: reference,
      amountDue: amount,
      dueOn: paymentDate ? new Date(paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
      priority: amount > 50000 ? "High" : amount > 10000 ? "Medium" : "Low",
      date: paymentDate ? new Date(paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
      payoutCategory,
      expenseCategory,
      reference,
      patientName,
      location,
      status,
    };
  });
}
