import React, { useState } from 'react';
import { Plus, Trash2, Printer, Wand2, Star, Eye } from 'lucide-react';
import {
  useScopeBarcodes,
  useRegisterBarcode,
  useRetireBarcode,
  useGenerateCatalogItemBarcodes,
  useBarcodeLabels,
  type BarcodeType,
  type BarcodeScopeType,
} from '../../../services/useBarcodes';

/**
 * Manage the barcodes attached to one product / catalog item, backed by the barcode registry.
 * Self-contained: pass the item's backend uid and, when known, the inventory catalog-item uid.
 *
 * - itemUid          -> registers product-identity codes (ITEM scope), same in every store
 * - catalogItemUid   -> enables auto-generate + label printing for the stock row
 */

const BARCODE_TYPES: { value: BarcodeType; label: string; hint: string }[] = [
  { value: 'GTIN_EAN13', label: 'EAN-13 (GTIN)', hint: 'Manufacturer 13-digit — globally unique' },
  { value: 'GTIN_UPC', label: 'UPC-A (GTIN)', hint: 'Manufacturer 12-digit' },
  { value: 'GTIN_EAN8', label: 'EAN-8 (GTIN)', hint: 'Small-pack 8-digit' },
  { value: 'ITF14', label: 'ITF-14 (case)', hint: 'Outer carton / case code' },
  { value: 'MANUFACTURER', label: 'Manufacturer', hint: 'Vendor code, unverified' },
  { value: 'INTERNAL', label: 'Internal', hint: 'Self-issued, in-store only' },
];

export const BarcodePanel: React.FC<{ itemUid?: string; catalogItemUid?: string }> = ({
  itemUid,
  catalogItemUid,
}) => {
  // Prefer product-identity scope when we have an item; else fall back to the catalog item.
  const scopeType: BarcodeScopeType = itemUid ? 'ITEM' : 'CATALOG_ITEM';
  const scopeUid = itemUid || catalogItemUid;

  const { data: barcodes, isLoading } = useScopeBarcodes(scopeUid ? scopeType : undefined, scopeUid);
  const register = useRegisterBarcode();
  const retire = useRetireBarcode();
  const generate = useGenerateCatalogItemBarcodes();
  const labels = useBarcodeLabels();

  const [code, setCode] = useState('');
  const [type, setType] = useState<BarcodeType>('GTIN_EAN13');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!scopeUid) {
    return (
      <div className="bg-white border border-[#EAEBF0] rounded-[16px] p-5 text-sm text-slate-400 text-left">
        Save the item first to manage its barcodes.
      </div>
    );
  }

  const list = barcodes ?? [];

  const add = () => {
    const v = code.trim();
    if (!v) return;
    setError(null);
    register.mutate(
      { barcode: v, barcodeType: type, scopeType, scopeUid, primary: list.length === 0 },
      {
        onSuccess: () => setCode(''),
        onError: (e: any) => setError(e?.message ?? 'Could not register barcode'),
      }
    );
  };

  const autoGenerate = () => {
    if (!catalogItemUid) {
      setError('Auto-generate needs the stock (catalog) item, not just the product.');
      return;
    }
    setError(null);
    generate.mutate(
      { uids: [catalogItemUid], format: 'EAN13', overwriteExisting: false },
      { onError: (e: any) => setError(e?.message ?? 'Could not generate barcode') }
    );
  };

  const preview = async (value: string) => {
    try {
      setBusy(true);
      const url = await labels.previewUrl(value);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (e: any) {
      setError(e?.message ?? 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const printLabels = async () => {
    if (!catalogItemUid) {
      setError('Label printing needs the stock (catalog) item.');
      return;
    }
    try {
      setBusy(true);
      setError(null);
      await labels.renderAndDownload({
        catalogItemUids: [catalogItemUid],
        outputFormat: 'ZPL',
        showPrice: true,
        showBatchInfo: true,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Label render failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-[#EAEBF0] rounded-[16px] p-5 space-y-4 shadow-3xs text-left">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-black text-[#1E1C24] uppercase tracking-wider">Barcodes</h5>
        <span className="text-[11px] font-semibold text-slate-400">
          {list.length} code{list.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Register a code */}
      <div className="flex flex-wrap gap-2">
        <input
          className="flex-1 min-w-[160px] border border-[#EAEBF0] rounded-lg px-3 py-2 text-sm"
          placeholder="Enter or scan a barcode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <select
          className="border border-[#EAEBF0] rounded-lg px-2 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as BarcodeType)}
        >
          {BARCODE_TYPES.map((t) => (
            <option key={t.value} value={t.value} title={t.hint}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          className="inline-flex items-center gap-1 bg-[#4361EE] text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={add}
          disabled={register.isPending || !code.trim()}
        >
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-1 border border-[#EAEBF0] rounded-lg px-3 py-2 text-sm font-semibold text-[#4361EE] disabled:opacity-50"
          onClick={autoGenerate}
          disabled={generate.isPending || !catalogItemUid}
          title={catalogItemUid ? 'Generate an internal EAN-13' : 'Needs a stock item'}
        >
          <Wand2 size={15} /> Auto-generate
        </button>
        <button
          className="inline-flex items-center gap-1 border border-[#EAEBF0] rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          onClick={printLabels}
          disabled={busy || !catalogItemUid}
          title={catalogItemUid ? 'Download a ZPL label file' : 'Needs a stock item'}
        >
          <Printer size={15} /> Print labels
        </button>
      </div>

      {error && <div className="text-[13px] text-red-600 font-medium">{error}</div>}

      {/* Registered codes */}
      {isLoading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-slate-400">No barcodes yet.</div>
      ) : (
        <ul className="divide-y divide-[#F1F2F6]">
          {list.map((b) => (
            <li key={b.uid} className="flex items-center justify-between py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {b.primary && <Star size={13} className="text-amber-500 shrink-0" fill="currentColor" />}
                <span className="font-mono text-[13px] text-[#0E1726] truncate">{b.barcode}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide shrink-0">
                  {b.barcodeType}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="p-1.5 text-slate-500 hover:text-[#4361EE] disabled:opacity-40"
                  onClick={() => preview(b.barcode)}
                  disabled={busy}
                  title="Preview"
                >
                  <Eye size={15} />
                </button>
                <button
                  className="p-1.5 text-slate-500 hover:text-red-600 disabled:opacity-40"
                  onClick={() =>
                    retire.mutate({ uid: b.uid, scopeType, scopeUid })
                  }
                  disabled={retire.isPending}
                  title="Retire"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {previewUrl && (
        <div className="pt-2 border-t border-[#F1F2F6]">
          <img src={previewUrl} alt="Barcode preview" className="max-h-28 object-contain" />
        </div>
      )}
    </div>
  );
};
