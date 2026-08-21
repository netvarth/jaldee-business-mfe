/**
 * Shipping-label print flows — bulk (A4, 2-up) and single (4×6).
 *
 * Bulk: select orders on the list → A4 sheet, two labels per row. Orders with no shipping
 * address are shown in a callout and excluded from the run. Single: from the order-details
 * header. Both isolate the print so window.print() emits only the label sheet, not the app.
 */
import { ShippingLabel } from "./ShippingLabel";
import { useOrderLabels } from "../../services/useOrderLabels";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .karty-label-print, .karty-label-print * { visibility: visible !important; }
  .karty-label-print { position: absolute !important; left: 0; top: 0; width: 100%; }
  .karty-label-noprint { display: none !important; }
  @page { size: A4; margin: 8mm; }
}
.karty-label-print { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
`;

function Shell({ title, subtitle, onClose, onPrint, printLabel, children }: {
  title: string; subtitle: string; onClose: () => void; onPrint: () => void; printLabel: string; children: React.ReactNode;
}) {
  return (
    <div className="karty-label-noprint fixed inset-0 z-[200] flex items-start justify-center overflow-auto bg-black/45 p-9" onClick={onClose}>
      <style>{PRINT_CSS}</style>
      <div className="w-[900px] max-w-full overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="text-[17px] font-extrabold text-slate-900">{title}</div>
            <div className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700">Cancel</button>
            <button onClick={onPrint} className="h-9 rounded-lg bg-[#55349A] px-4 text-[13px] font-bold text-white">{printLabel}</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BulkLabelPreview({ orderUids, sellerName, onClose }: { orderUids: string[]; sellerName: string; onClose: () => void }) {
  const { data, isLoading, error } = useOrderLabels(orderUids, sellerName);
  const labels = data?.labels ?? [];
  const skipped = data?.skipped ?? [];

  return (
    <Shell
      title="Bulk print preview"
      subtitle={isLoading ? "Preparing labels…" : `A4 sheet · ${labels.length} label${labels.length === 1 ? "" : "s"}, 2-up${skipped.length ? ` · ${skipped.length} skipped` : ""}`}
      onClose={onClose}
      onPrint={() => window.print()}
      printLabel={`Print ${labels.length} label${labels.length === 1 ? "" : "s"}`}
    >
      <div className="max-h-[72vh] overflow-auto bg-slate-100 p-6">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-slate-500">Building labels…</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">Couldn't load the selected orders.</div>
        ) : (
          <>
            {skipped.length > 0 && (
              <div className="karty-label-noprint mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-800">
                <span className="font-extrabold">⚠</span>
                <div>
                  <strong>{skipped.length} order{skipped.length === 1 ? "" : "s"} skipped — no shipping address.</strong>{" "}
                  {skipped.map((s) => `${s.no} (${s.name})`).join(", ")} {skipped.length === 1 ? "is" : "are"} excluded from this run. Add a shipping address to include {skipped.length === 1 ? "it" : "them"}.
                </div>
              </div>
            )}
            {labels.length === 0 ? (
              <p className="py-14 text-center text-sm text-slate-500">No printable labels — every selected order is missing a shipping address.</p>
            ) : (
              <div className="karty-label-print mx-auto grid w-[794px] max-w-full grid-cols-2 gap-4 border border-slate-300 bg-white p-6 shadow-md">
                {labels.map((m, i) => <ShippingLabel key={i} m={m} size="a4" />)}
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

export function SingleLabelPreview({ orderUid, sellerName, onClose }: { orderUid: string; sellerName: string; onClose: () => void }) {
  const { data, isLoading, error } = useOrderLabels([orderUid], sellerName);
  const label = data?.labels?.[0];
  const skipped = (data?.skipped ?? []).length > 0;

  return (
    <Shell title="Shipping label" subtitle={label ? label.orderNo : "Preparing…"} onClose={onClose} onPrint={() => window.print()} printLabel="Print label">
      <div className="flex max-h-[72vh] justify-center overflow-auto bg-slate-100 p-8">
        {isLoading ? (
          <p className="py-16 text-sm text-slate-500">Building label…</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">Couldn't load the order.</div>
        ) : skipped || !label ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">This order has no shipping address — add one to print a label.</div>
        ) : (
          <div className="karty-label-print"><ShippingLabel m={label} size="full" /></div>
        )}
      </div>
    </Shell>
  );
}
