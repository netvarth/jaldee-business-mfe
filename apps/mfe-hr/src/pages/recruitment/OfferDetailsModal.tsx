import { Dialog, DialogFooter, Button, Badge } from "@jaldee/design-system";
import type { Offer, Candidate } from "../../types";

export interface OfferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  candidate?: Candidate | null;
  onConvert?: () => void;
}

function fmtDate(d?: string) {
  return d ? new Date(String(d)).toLocaleDateString() : "—";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value ?? "—"}</span>
    </div>
  );
}

/** Read-only detail of an offer, with the candidate resolved. */
export function OfferDetailsModal({ isOpen, onClose, offer, candidate, onConvert }: OfferDetailsModalProps) {
  if (!offer) return null;
  const v = String(offer.status).toUpperCase();
  const variant = v === "ACCEPTED" ? "success" : v === "DECLINED" ? "danger" : v === "SENT" ? "warning" : "neutral";
  const salary = offer.offeredSalary != null ? `${offer.currency || "₹"} ${Number(offer.offeredSalary).toLocaleString()}` : "—";

  return (
    <Dialog open={isOpen} onClose={onClose} title="Offer details" size="md">
      <div className="space-y-4">
        <div className="rounded-lg bg-violet-50 border border-violet-100 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Candidate</div>
          <div className="text-base font-bold text-gray-900 mt-0.5">{candidate?.name ?? "Unknown candidate"}</div>
          {candidate?.email && <div className="text-xs text-gray-500">{candidate.email}{candidate.phone ? ` · ${candidate.phone}` : ""}</div>}
        </div>

        <div>
          <Row label="Status" value={<Badge variant={variant}>{offer.status}</Badge>} />
          <Row label="Designation" value={offer.designation} />
          <Row label="Offered salary (CTC)" value={salary} />
          <Row label="Joining date" value={fmtDate(offer.joiningDate)} />
          <Row label="Valid until" value={fmtDate(offer.validUntil)} />
          <Row label="Probation period" value={offer.probationPeriod} />
          <Row label="Sent at" value={fmtDate(offer.sentAt)} />
          <Row label="Application" value={<span className="text-xs text-gray-400">{offer.applicationId}</span>} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {v === "ACCEPTED" && onConvert && (
            <Button variant="primary" onClick={() => { onClose(); onConvert(); }}>Convert to Employee</Button>
          )}
        </DialogFooter>
      </div>
    </Dialog>
  );
}
