import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  useItemRemarks,
  useCreateItemRemark,
  useSetItemRemarkActive,
  useDeleteItemRemark,
} from '../../../services/useItemRemarks';

/**
 * Free-text remarks/notes on a stock item (backed by /item-remarks).
 * Self-contained: pass the item's backend uid.
 */
export const ItemRemarksPanel: React.FC<{ itemUid?: string }> = ({ itemUid }) => {
  const { data: remarks, isLoading } = useItemRemarks(itemUid);
  const create = useCreateItemRemark();
  const setActive = useSetItemRemarkActive();
  const remove = useDeleteItemRemark();

  const [text, setText] = useState('');

  if (!itemUid) return null;

  const add = () => {
    const v = text.trim();
    if (!v) return;
    create.mutate({ itemUid, remark: v }, { onSuccess: () => setText('') });
  };

  const list = remarks ?? [];

  return (
    <div className="bg-white border border-[#EAEBF0] rounded-[16px] p-5 space-y-4 shadow-3xs text-left">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-black text-[#1E1C24] uppercase tracking-wider">Remarks</h5>
        <span className="text-[11px] font-semibold text-slate-400">{list.length} note{list.length === 1 ? '' : 's'}</span>
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="Add a remark about this item…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10"
        />
        <button
          type="button"
          onClick={add}
          disabled={create.isPending || !text.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#55349A] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#43297a] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {create.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {create.error instanceof Error ? create.error.message : 'Could not add the remark.'}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading remarks…</p>
      ) : list.length === 0 ? (
        <p className="text-sm italic text-slate-400">No remarks yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((r) => (
            <li key={r.uid} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className={'text-sm ' + (r.active === false ? 'text-slate-400 line-through' : 'text-slate-800')}>
                  {r.remark}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActive.mutate({ uid: r.uid, itemUid, active: r.active === false })}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                >
                  {r.active === false ? 'Activate' : 'Deactivate'}
                </button>
                <button
                  type="button"
                  aria-label="Delete remark"
                  onClick={() => remove.mutate({ uid: r.uid, itemUid })}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ItemRemarksPanel;
