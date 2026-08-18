import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button, Dialog, DialogFooter, Textarea } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { useMemos, WarningMemo } from "../../services/useLifecycle";
import { formatDate } from "../../lib/utils";
import { severityBadge } from "../enforcement/WarningMemosAdmin";

export function EssMemos() {
  const { eventBus } = useMFEProps();
  const memos = useMemos({ isEss: true });
  const [ackMemo, setAckMemo] = useState<WarningMemo | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pendingCount = useMemo(
    () => memos.data.filter((m) => !m.acknowledgedAt).length,
    [memos.data]
  );

  const handleAcknowledge = async () => {
    if (!ackMemo) return;
    setSubmitting(true);
    try {
      await memos.acknowledge(ackMemo.id || ackMemo.uid || "", comment);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Warning Memo",
        message: "Notice acknowledged successfully.",
      });
      setAckMemo(null);
      setComment("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to acknowledge notice.";
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Warning Memo",
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="hr-ess-memos-page" data-testid="hr-ess-memos-page" className="space-y-6">
      {/* Banner Alert for Pending Memos */}
      {pendingCount > 0 && (
        <div
          id="hr-ess-memos-banner"
          data-testid="hr-ess-memos-banner"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 shadow-xs"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="font-extrabold text-amber-900 text-sm">Action Required</div>
            <div className="text-xs text-amber-800 font-medium">
              You have <strong className="font-black text-amber-950">{pendingCount}</strong> unacknowledged warning notice{pendingCount === 1 ? "" : "s"}. Please review and digitally acknowledge receipt.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Warning Notices & Memos</h2>
          <p className="text-xs text-slate-500 font-medium">
            Review disclosures and warning notices addressed to you by HR.
          </p>
        </div>
      </div>

      {/* Cards List */}
      {memos.loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading notices...</div>
      ) : memos.data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div className="font-bold text-slate-800 text-base">No Warning Notices</div>
          <div className="text-xs text-slate-500">You have zero warning notices or compliance actions on record.</div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="hr-ess-memos-list">
          {memos.data.map((memo) => {
            const isAck = Boolean(memo.acknowledgedAt);
            return (
              <div
                key={memo.id || memo.uid}
                data-testid={`hr-ess-memo-card-${memo.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5 transition-all hover:border-slate-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {memo.category || "General Notice"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${severityBadge(
                        memo.severity
                      )}`}
                    >
                      {memo.severity || "Medium"} Severity
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Issued {memo.issuedOn ? formatDate(memo.issuedOn) : "recently"}
                  </div>
                </div>

                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {memo.description}
                </p>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 font-medium">
                    Issued By: <span className="font-bold text-slate-700">{memo.issuedByName || "HR Management"}</span>
                  </div>

                  {isAck ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        <CheckCircle2 size={14} /> Acknowledged on {formatDate(memo.acknowledgedAt)}
                      </span>
                      {memo.ackComment && (
                        <span className="text-[11px] text-slate-500 italic">
                          "{memo.ackComment}"
                        </span>
                      )}
                    </div>
                  ) : (
                    <Button
                      id={`hr-ess-memo-ack-btn-${memo.id}`}
                      data-testid={`hr-ess-memo-ack-btn-${memo.id}`}
                      variant="primary"
                      size="sm"
                      icon={<FileText size={14} />}
                      onClick={() => {
                        setAckMemo(memo);
                        setComment("");
                      }}
                    >
                      Acknowledge Notice
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Acknowledge Confirmation Modal */}
      <Dialog
        open={Boolean(ackMemo)}
        onClose={() => setAckMemo(null)}
        testId="hr-ess-ack-modal"
        title="Acknowledge Warning Notice"
      >
        {ackMemo && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
              <div className="font-bold text-slate-800">
                Notice: {ackMemo.category} ({ackMemo.severity} Severity)
              </div>
              <div className="text-slate-600 line-clamp-2">{ackMemo.description}</div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-950 font-medium leading-relaxed">
              <strong>HR Disclaimer:</strong> By clicking Acknowledge, you confirm that you have received and reviewed this warning memo notice. Digital acknowledgement is recorded with your timestamp.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Acknowledgement Comment <span className="text-slate-400 font-normal">(Optional, max 500 chars)</span>
              </label>
              <Textarea
                id="hr-ess-ack-comment"
                data-testid="hr-ess-ack-comment"
                rows={3}
                maxLength={500}
                placeholder="Add any clarification or notes regarding this warning notice..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
        )}
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setAckMemo(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            id="hr-ess-ack-submit-btn"
            data-testid="hr-ess-ack-submit-btn"
            variant="primary"
            onClick={handleAcknowledge}
            loading={submitting}
          >
            Confirm Acknowledgement
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
export default EssMemos;
