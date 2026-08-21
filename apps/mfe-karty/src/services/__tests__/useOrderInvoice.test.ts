import { describe, it, expect } from "vitest";
import { buildInvoiceModel } from "../useOrderInvoice";

/**
 * GST Tax Invoice compute — rule matrix.
 *
 * Business rule (confirmed 2026-08-14):
 *   • B2C consumer  → the consumer's state is IGNORED: always intra-state (CGST + SGST).
 *   • B2B partner   → the PARTNER'S state decides intra vs inter; the state code is the first
 *                     two digits of the partner's GSTIN (authoritative).
 * Seller is Kerala (GSTIN state code 32) in every case below.
 */

const SELLER_GSTIN = "32AABCS1429B1ZP"; // Kerala (32)

// One line: "GST Test Item 18%" @ ₹999 × 1  → taxable 999, tax 179.82, grand 1179 (round +0.18)
const itemsById = {
  "item-18": { uid: "item-18", name: "GST Test Item 18%", attributes: { taxGroup: "GST 18%", hsnCode: "1234" } },
  "item-5": { uid: "item-5", name: "GST Test Item 5%", attributes: { taxGroup: "GST 5%", hsnCode: "5678" } },
};
const unitsById = { "unit-nos": "Nos" };

function baseOrder(overrides: Record<string, any> = {}) {
  return {
    orderNo: "00031",
    orderDate: "2026-08-14T06:05:00Z",
    items: [{ itemUid: "item-18", sellQty: 1, unitPrice: 999, unitUid: "unit-nos" }],
    consumerName: "Test Buyer",
    consumerPhone: "+91 98765 43210",
    billingAddress: "MG Road, Kozhikode",
    ...overrides,
  };
}

const seller = {
  sellerGstin: SELLER_GSTIN,
  sellerName: "Global Care Hospital",
  sellerAddress: "MG Road, Kozhikode",
  itemsById,
  unitsById,
};

const labels = (m: any) => m.totals.map((t: any) => t.label);
const placeOfSupply = (m: any) => m.meta.find((r: any) => r.label === "Place of Supply")?.value;

describe("buildInvoiceModel — B2C consumer (state ignored → always intra)", () => {
  it("same-state consumer (Kerala) → INTRA / CGST+SGST", () => {
    const m = buildInvoiceModel({
      ...seller, order: baseOrder(), isB2B: false,
      customer: { displayName: "Anitha Nair", state: "Kerala", gstin: "" }, partner: null,
    });
    expect(m.taxKind).toBe("INTRA");
    expect(labels(m)).toEqual(expect.arrayContaining(["CGST", "SGST"]));
    expect(labels(m)).not.toContain("IGST");
  });

  it("OTHER-state consumer (Karnataka) → STILL INTRA (consumer state is ignored)", () => {
    const m = buildInvoiceModel({
      ...seller, order: baseOrder(), isB2B: false,
      customer: { displayName: "Ramesh Gowda", state: "Karnataka", gstin: "" }, partner: null,
    });
    // The whole point of the rule: a B2C sale never becomes inter-state on the consumer's address.
    expect(m.taxKind).toBe("INTRA");
    expect(labels(m)).not.toContain("IGST");
    // Place of supply falls back to the seller's own state for B2C.
    expect(placeOfSupply(m)).toContain("Kerala");
  });

  it("walk-in guest (no customer) → INTRA", () => {
    const m = buildInvoiceModel({ ...seller, order: baseOrder({ consumerUid: null }), isB2B: false, customer: null, partner: null });
    expect(m.taxKind).toBe("INTRA");
  });
});

describe("buildInvoiceModel — B2B partner (partner GSTIN state decides)", () => {
  it("same-state partner (Kerala GSTIN 32) → INTRA", () => {
    const m = buildInvoiceModel({
      ...seller, order: baseOrder({ channel: "B2B", partnerUid: "p1" }), isB2B: true,
      customer: null, partner: { name: "Kerala Wholesale", gstin: "32AAACP1234Q1Z5", billingAddress: "Kochi" },
    });
    expect(m.taxKind).toBe("INTRA");
    expect(labels(m)).toEqual(expect.arrayContaining(["CGST", "SGST"]));
  });

  it("OTHER-state partner (Karnataka GSTIN 29) → INTER / IGST", () => {
    const m = buildInvoiceModel({
      ...seller, order: baseOrder({ channel: "B2B", partnerUid: "p2" }), isB2B: true,
      customer: null, partner: { name: "Bengaluru Distributors", gstin: "29AAACP1234Q1Z5", billingAddress: "Bengaluru" },
    });
    expect(m.taxKind).toBe("INTER");
    expect(labels(m)).toContain("IGST");
    expect(labels(m)).not.toContain("CGST");
    expect(placeOfSupply(m)).toContain("Karnataka");
    expect(placeOfSupply(m)).toContain("(29)");
  });

  it("partner with no GSTIN → falls back to INTRA (cannot prove inter-state)", () => {
    const m = buildInvoiceModel({
      ...seller, order: baseOrder({ channel: "B2B", partnerUid: "p3" }), isB2B: true,
      customer: null, partner: { name: "Unregistered Partner", gstin: "", billingAddress: "—" },
    });
    expect(m.taxKind).toBe("INTRA");
  });
});

describe("buildInvoiceModel — tax comes from the item, and totals/round-off", () => {
  it("per-line rate is read from item attributes.taxGroup (18%)", () => {
    const m = buildInvoiceModel({
      ...seller, order: baseOrder(), isB2B: false,
      customer: { state: "Kerala" }, partner: null,
    });
    expect(m.lines[0].hsn).toBe("1234");
    // intra split: 9% CGST + 9% SGST on 999 = 89.91 each
    expect(m.lines[0].crate).toBe("9%");
    expect(m.lines[0].camt).toBe("89.91");
    expect(m.lines[0].samt).toBe("89.91");
    // grand = round(999 + 179.82) = 1179
    expect(m.grandValue).toBe("₹1,179.00");
  });

  it("a different item rate (5%) flows through", () => {
    const m = buildInvoiceModel({
      ...seller,
      order: baseOrder({ items: [{ itemUid: "item-5", sellQty: 2, unitPrice: 100, unitUid: "unit-nos" }] }),
      isB2B: false, customer: { state: "Kerala" }, partner: null,
    });
    // taxable 200, 5% → 10 tax (2.5 CGST%+2.5 SGST% → 5 + 5), grand 210
    expect(m.lines[0].crate).toBe("2.5%");
    expect(m.grandValue).toBe("₹210.00");
  });

  it("an item with no taxGroup contributes zero tax (documents the silent-zero edge)", () => {
    const m = buildInvoiceModel({
      ...seller,
      order: baseOrder({ items: [{ itemUid: "unknown-item", sellQty: 1, unitPrice: 500, unitUid: "unit-nos" }] }),
      isB2B: false, customer: { state: "Kerala" }, partner: null,
    });
    expect(m.grandValue).toBe("₹500.00");
  });
});
