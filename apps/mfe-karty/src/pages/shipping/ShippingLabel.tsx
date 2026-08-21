/**
 * Shipping label artwork — 4″×6″ thermal, monochrome, high-contrast.
 * Ported from the Claude Design reference "Shipping Labels.dc.html".
 *
 * COD vs prepaid never relies on colour (weight + border carry it). The item list is the focus —
 * packers verify contents against it. Order no. is printed as human text AND a Code-128-style
 * barcode + a QR. Carrier / AWB is a configurable slot that may be blank until assigned.
 *
 * Pure presentation: it renders a persisted-ish LabelModel built by buildLabelModel from a real order.
 */

export interface LabelItem { name: string; qty: string }

export interface LabelModel {
  orderNo: string;          // human + barcode text, e.g. "KRT-00029"
  fromLine: string;         // seller return address (one line)
  carrier?: string;         // "BLUEDART" — may be blank
  awb?: string;             // "77413902288" — may be blank
  shipToName: string;
  shipToAddr: string;       // street lines (may contain <br>)
  shipToCity: string;       // "Pune, Maharashtra — 411045"
  shipToPhone?: string;
  billToLine: string;       // single-line bill-to
  items: LabelItem[];
  summary: string;          // "2 items · 2 units · 12 Aug 2026"
  payLine: string;          // "COD ₹1,499" or "PREPAID"
  isCod: boolean;
}

const MONO = "ui-monospace, 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

// Fixed Code-128-style bar pattern (visual only) + a 7×7 QR seed.
const BAR_WIDTHS = [2,1,1,2,3,1,2,1,1,3,2,1,1,2,1,3,1,2,2,1,3,1,1,2,1,2,3,1,1,2,1,3,2,1,1,2,1,1,3,2];
const QR_SEED = [1,0,1,1,0,1,1, 0,1,1,0,1,0,0, 1,1,0,1,1,0,1, 0,0,1,1,0,1,0, 1,0,1,0,1,1,1, 1,1,0,1,0,0,1, 0,1,1,0,1,1,0];

function Barcode({ code, h }: { code: string; h: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: h }}>
        {BAR_WIDTHS.map((w, i) => <span key={i} style={{ display: "inline-block", height: "100%", width: w, background: i % 2 === 0 ? "#000" : "#fff" }} />)}
      </div>
      <div style={{ fontSize: h > 40 ? 15 : 10, fontWeight: 800, letterSpacing: ".14em", fontFamily: MONO, marginTop: 4 }}>{code}</div>
    </div>
  );
}
function Qr({ px }: { px: number }) {
  return (
    <div style={{ width: px, height: px, border: "1px solid #000", display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridTemplateRows: "repeat(7,1fr)", gap: 1, padding: px > 50 ? 4 : 2, flexShrink: 0 }}>
      {QR_SEED.map((v, i) => <span key={i} style={{ background: v ? "#000" : "#fff" }} />)}
    </div>
  );
}

/** size "full" = 384px 4×6 preview; "a4" = compact for the 2-up A4 sheet. */
export function ShippingLabel({ m, size = "full" }: { m: LabelModel; size?: "full" | "a4" }) {
  const a4 = size === "a4";
  return (
    <div style={{ width: a4 ? "100%" : 384, maxWidth: "100%", background: "#fff", border: "2px solid #000", color: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* FROM / CARRIER strip */}
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", fontSize: a4 ? 7.5 : 9, lineHeight: 1.3 }}>
        <div style={{ padding: a4 ? "4px 6px" : "6px 8px", maxWidth: "56%" }}>
          <div style={{ fontWeight: 800, letterSpacing: ".05em" }}>FROM</div>
          <div>{m.fromLine}</div>
        </div>
        <div style={{ padding: a4 ? "4px 6px" : "6px 8px", borderLeft: "1px dashed #000", textAlign: "right", flex: 1 }}>
          <div style={{ fontWeight: 800, letterSpacing: ".05em" }}>{m.carrier || "CARRIER"}</div>
          {m.awb ? <div style={{ fontFamily: MONO, fontWeight: 700 }}>AWB {m.awb}</div> : <div style={{ color: "#555" }}>Unassigned</div>}
        </div>
      </div>

      {/* SHIP TO */}
      <div style={{ padding: a4 ? "7px 8px" : "10px 12px", borderBottom: "2px solid #000" }}>
        <div style={{ fontSize: a4 ? 8 : 11, fontWeight: 900, letterSpacing: ".1em" }}>SHIP TO</div>
        <div style={{ fontSize: a4 ? 15 : 22, fontWeight: 900, lineHeight: 1.05, marginTop: a4 ? 2 : 3 }}>{m.shipToName}</div>
        <div style={{ fontSize: a4 ? 10 : 14, fontWeight: 600, lineHeight: 1.3, marginTop: a4 ? 2 : 4 }} dangerouslySetInnerHTML={{ __html: m.shipToAddr }} />
        <div style={{ fontSize: a4 ? 11 : 16, fontWeight: 800, marginTop: a4 ? 2 : 4 }}>{m.shipToCity}</div>
        {m.shipToPhone && <div style={{ fontSize: a4 ? 10 : 14, fontWeight: 700, marginTop: a4 ? 1 : 3, fontFamily: MONO }}>☎ {m.shipToPhone}</div>}
      </div>

      {/* BILL TO */}
      <div style={{ padding: a4 ? "4px 8px" : "8px 12px", borderBottom: a4 ? "1px solid #000" : "2px solid #000", fontSize: a4 ? 8 : 12, lineHeight: 1.4 }}>
        <span style={{ fontWeight: 900, letterSpacing: ".1em" }}>BILL TO </span>{m.billToLine}
      </div>

      {/* ITEMS — the focus */}
      <div style={{ borderBottom: a4 ? "1px solid #000" : "2px solid #000" }}>
        {!a4 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid #000", fontSize: 10, fontWeight: 900, letterSpacing: ".08em" }}>
            <span>ITEMS</span><span>QTY</span>
          </div>
        )}
        {m.items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: a4 ? 6 : 12, padding: a4 ? "2px 8px" : "5px 12px", fontSize: a4 ? 9 : 12.5, fontWeight: 600, borderBottom: a4 ? undefined : "1px solid #ddd" }}>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
            <span style={{ fontFamily: MONO, fontWeight: 800, whiteSpace: "nowrap" }}>{it.qty}</span>
          </div>
        ))}
      </div>

      {/* summary + payment */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: a4 ? 6 : 10, padding: a4 ? "4px 8px" : "8px 12px", borderBottom: "2px solid #000", fontSize: a4 ? 9 : 11.5, fontWeight: 700 }}>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.summary}</span>
        <span style={{ border: a4 ? "1.5px solid #000" : "2px solid #000", padding: a4 ? "1px 6px" : "3px 10px", fontSize: a4 ? 9 : 13, fontWeight: 800, whiteSpace: "nowrap" }}>{m.payLine}</span>
      </div>

      {/* barcode + QR */}
      <div style={{ display: "flex", alignItems: "center", gap: a4 ? 6 : 12, padding: a4 ? "5px 8px" : "11px 12px" }}>
        <div style={{ flex: 1 }}><Barcode code={m.orderNo} h={a4 ? 26 : 48} /></div>
        <Qr px={a4 ? 40 : 70} />
      </div>
    </div>
  );
}
