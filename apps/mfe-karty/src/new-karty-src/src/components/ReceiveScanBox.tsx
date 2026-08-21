import React, { useState } from 'react';
import { ScanLine, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { useScanToReceive, type ScanReceiveResult } from '../../../services/usePurchases';

/**
 * Scan-to-receive: scan a barcode against a draft purchase to see which line it belongs to.
 * The scan is a resolver — it does not change quantities; it tells the operator whether the
 * scanned unit is on this purchase (confirm/increment the line), a known product that is not
 * (add a line), or an unknown code.
 *
 * Self-contained: pass the purchase's backend uid.
 */
export const ReceiveScanBox: React.FC<{ purchaseUid?: string }> = ({ purchaseUid }) => {
  const scan = useScanToReceive();
  const [code, setCode] = useState('');
  const [history, setHistory] = useState<ScanReceiveResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!purchaseUid) return null;

  const submit = () => {
    const v = code.trim();
    if (!v) return;
    setError(null);
    scan.mutate(
      { purchaseUid, barcode: v },
      {
        onSuccess: (r) => {
          setHistory((h) => [r, ...h].slice(0, 8));
          setCode('');
        },
        onError: (e: any) => setError(e?.message ?? 'Scan failed'),
      }
    );
  };

  const style = (s: ScanReceiveResult['status']) =>
    s === 'MATCHED_LINE'
      ? { icon: <CheckCircle2 size={16} className="text-emerald-600" />, cls: 'text-emerald-700' }
      : s === 'KNOWN_ITEM_NOT_ON_PURCHASE'
      ? { icon: <AlertTriangle size={16} className="text-amber-600" />, cls: 'text-amber-700' }
      : { icon: <HelpCircle size={16} className="text-red-600" />, cls: 'text-red-700' };

  return (
    <div className="bg-white border border-[#EAEBF0] rounded-[16px] p-5 space-y-3 shadow-3xs text-left">
      <div className="flex items-center gap-2">
        <ScanLine size={16} className="text-[#4361EE]" />
        <h5 className="text-sm font-black text-[#1E1C24] uppercase tracking-wider">Scan to receive</h5>
      </div>

      <div className="flex gap-2">
        <input
          autoFocus
          className="flex-1 border border-[#EAEBF0] rounded-lg px-3 py-2 text-sm font-mono"
          placeholder="Scan or type a barcode, then Enter"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button
          className="inline-flex items-center gap-1 bg-[#4361EE] text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={submit}
          disabled={scan.isPending || !code.trim()}
        >
          Scan
        </button>
      </div>

      {error && <div className="text-[13px] text-red-600 font-medium">{error}</div>}

      {history.length > 0 && (
        <ul className="divide-y divide-[#F1F2F6] pt-1">
          {history.map((r, i) => {
            const s = style(r.status);
            return (
              <li key={`${r.barcode}-${i}`} className="flex items-center gap-2 py-2">
                {s.icon}
                <span className="font-mono text-[12px] text-slate-500 shrink-0">{r.barcode}</span>
                <span className={`text-[13px] font-semibold truncate ${s.cls}`}>
                  {r.status === 'MATCHED_LINE'
                    ? `${r.itemName ?? 'Item'} — on this purchase`
                    : r.status === 'KNOWN_ITEM_NOT_ON_PURCHASE'
                    ? `${r.itemName ?? 'Item'} — not on this purchase`
                    : 'Unknown barcode'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
