import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStores } from '../../../services/useStores';
import {
  useSequences,
  useUpsertSequence,
  formatPreview,
  SequenceDto,
  TENANT_LEVEL_STORE,
} from '../../../services/useCommerceSequences';

/**
 * Order-number format editor.
 *
 * Edits the ORDER document sequence (prefix / suffix / zero-pad width / next number).
 * When the tenant's numbering scope is STORE each store keeps its own sequence, so a
 * store picker is shown; when TENANT there is a single shared sequence.
 *
 * The scope itself (STORE vs TENANT) is owned by the settings form in OrderSettingsTab
 * and passed in here; this card only manages the per-key sequence config.
 */
export const OrderNumberingCard = ({ scope }: { scope: 'STORE' | 'TENANT' }) => {
  const { data: stores } = useStores();
  const { data: sequences, isLoading } = useSequences();
  const upsert = useUpsertSequence();

  const [storeId, setStoreId] = useState<string>('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [padLength, setPadLength] = useState(5);
  const [nextNumber, setNextNumber] = useState(1);

  // Default the store selection to the first store once loaded.
  useEffect(() => {
    if (scope === 'STORE' && !storeId && stores && stores.length > 0) {
      setStoreId(stores[0].id);
    }
  }, [scope, stores, storeId]);

  // The sequence key we're editing: a real store uid, or the tenant sentinel.
  const effectiveStoreUid = scope === 'TENANT' ? TENANT_LEVEL_STORE : storeId;

  const current: SequenceDto | undefined = useMemo(
    () =>
      sequences?.find(
        (s) => s.scope === 'ORDER' && (s.storeUid ?? TENANT_LEVEL_STORE) === effectiveStoreUid,
      ),
    [sequences, effectiveStoreUid],
  );

  // Re-seed the form whenever the selected key (store/scope) or loaded data changes.
  useEffect(() => {
    setPrefix(current?.prefix ?? '');
    setSuffix(current?.suffix ?? '');
    setPadLength(current?.padLength ?? 5);
    setNextNumber(current?.nextNumber ?? 1);
  }, [current, effectiveStoreUid]);

  const canSave = scope === 'TENANT' || !!storeId;

  const save = () => {
    if (!canSave) return;
    const dto: SequenceDto = {
      scope: 'ORDER',
      // Omit storeUid for tenant-level so the backend uses its sentinel.
      ...(scope === 'STORE' ? { storeUid: storeId } : {}),
      prefix: prefix || undefined,
      suffix: suffix || undefined,
      padLength,
      nextNumber,
    };
    upsert.mutate(dto);
  };

  const preview = formatPreview(prefix, nextNumber, suffix, padLength);
  const inputCls =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">Order number format</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {scope === 'STORE'
              ? 'Each store runs its own numbers with its own prefix/suffix.'
              : 'One shared numbering stream across all stores.'}
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={upsert.isPending || !canSave}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all disabled:opacity-50',
            upsert.isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#55349A] hover:bg-[#43297a]',
          )}
        >
          {upsert.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
          {upsert.isPending ? 'Saving…' : upsert.isSuccess ? 'Saved' : 'Save format'}
        </button>
      </div>

      {upsert.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-700">
          Couldn't save:{' '}
          {upsert.error instanceof Error ? upsert.error.message : 'the service rejected the change.'}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-slate-400">Loading order numbering…</div>
      ) : (
        <>
          {scope === 'STORE' ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Store</span>
              {stores && stores.length > 0 ? (
                <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={inputCls}>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-slate-400">No stores yet — create a store first.</span>
              )}
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Prefix</span>
              <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. ORD-" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Suffix</span>
              <input type="text" value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="e.g. /24" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Pad width</span>
              <input
                type="number"
                min={1}
                max={12}
                value={padLength}
                onChange={(e) => setPadLength(Math.max(1, parseInt(e.target.value) || 1))}
                className={cn(inputCls, 'text-right')}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Next number</span>
              <input
                type="number"
                min={1}
                value={nextNumber}
                onChange={(e) => setNextNumber(Math.max(1, parseInt(e.target.value) || 1))}
                className={cn(inputCls, 'text-right')}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold">Next order will be:</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[13px] font-semibold text-slate-800">
              {preview}
            </span>
            <span className="text-slate-400">(pad width 1 = no leading zeros)</span>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderNumberingCard;
