import { Button, DatePicker, Dialog, DialogFooter, Input, Select, Textarea } from "@jaldee/design-system";
import { formatCurrency } from "../../lib/financeData";

export default function MasterInvoiceDialogs(props: any) {
  const { paymentDialogOpen, closePaymentDialog, paymentAction, shareEmail, setShareEmail, shareMobile, setShareMobile, paymentAmount, setPaymentAmount, paymentMode, setPaymentMode, paymentDate, setPaymentDate, paymentTransactionId, setPaymentTransactionId, paymentNote, setPaymentNote, paymentError, paymentSubmitting, submitPaymentAction, paymentHistoryOpen, setPaymentHistoryOpen, paymentHistoryError, paymentHistoryLoading, paymentEntries, openEditPaymentDialog, editingPayment, closeEditPaymentDialog, editPaymentAmount, setEditPaymentAmount, editPaymentMode, setEditPaymentMode, editPaymentDate, setEditPaymentDate, editPaymentTransactionId, setEditPaymentTransactionId, editPaymentNote, setEditPaymentNote, editPaymentError, editPaymentSubmitting, submitEditedPayment } = props;
  return (
    <>
      <Dialog
        open={paymentDialogOpen}
        onClose={closePaymentDialog}
        title={
          paymentAction === "paylink"
            ? "Share Payment Link"
            : paymentAction === "paycash"
              ? "Pay by Cash"
              : "Pay by Others"
        }
        size="md"
      >
        <div className="space-y-4 pt-2">
          {paymentAction === "paylink" ? (
            <>
              <Input
                label="Email"
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                placeholder="Customer email"
              />
              <Input
                label="Mobile"
                value={shareMobile}
                onChange={(event) => setShareMobile(event.target.value)}
                placeholder="Customer mobile number"
              />
            </>
          ) : (
            <>
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="Payment amount"
              />
              {paymentAction === "payothers" ? (
                <Select
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value)}
                  options={[
                    { value: "UPI", label: "UPI" },
                    { value: "Card", label: "Card" },
                    { value: "Bank Transfer", label: "Bank Transfer" },
                    { value: "Cheque", label: "Cheque" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              ) : null}
              <DatePicker
                label="Payment Date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
              {paymentAction === "payothers" ? (
                <Input
                  label="Transaction ID"
                  value={paymentTransactionId}
                  onChange={(event) => setPaymentTransactionId(event.target.value)}
                  placeholder="Transaction ID"
                />
              ) : null}
              <Textarea
                label="Payment Note"
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                rows={4}
                placeholder="Add payment note"
              />
            </>
          )}

          {paymentError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {paymentError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePaymentDialog} disabled={paymentSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitPaymentAction()} disabled={paymentSubmitting}>
              {paymentSubmitting ? "Processing..." : paymentAction === "paylink" ? "Share Link" : "Submit Payment"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog
        open={paymentHistoryOpen}
        onClose={() => setPaymentHistoryOpen(false)}
        title="Amount Paid"
        size="lg"
      >
        <div className="space-y-4 pt-2">
          {paymentHistoryError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {paymentHistoryError}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-3 py-3 font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-3 py-3 font-semibold uppercase tracking-wide">Mode</th>
                  <th className="px-3 py-3 font-semibold uppercase tracking-wide">Gateway</th>
                  <th className="px-3 py-3 font-semibold uppercase tracking-wide">Date & Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paymentHistoryLoading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">Loading paid entries...</td>
                  </tr>
                ) : paymentEntries.length ? (
                  paymentEntries.map((entry) => (
                    <tr key={entry.uid} className="align-top text-slate-700">
                      <td className="px-3 py-4 font-medium text-slate-800">{entry.status}</td>
                      <td className="px-3 py-4">{entry.mode}</td>
                      <td className="px-3 py-4">{entry.gateway}</td>
                      <td className="px-3 py-4">
                        <div>{entry.paymentDateLabel}</div>
                        {entry.paymentTimeLabel ? <div>{entry.paymentTimeLabel}</div> : null}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{formatCurrency(entry.amount)}</span>
                          <button
                            type="button"
                            className="text-sm font-medium text-indigo-700 underline underline-offset-4"
                            onClick={() => openEditPaymentDialog(entry)}
                          >
                            Edit
                          </button>
                        </div>
                        {entry.note ? <div className="mt-1 text-xs text-slate-500">{entry.note}</div> : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-400">No paid entries available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setPaymentHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(editingPayment)}
        onClose={closeEditPaymentDialog}
        title="Edit Paid Amount"
        size="md"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={editPaymentAmount}
            onChange={(event) => setEditPaymentAmount(event.target.value)}
            placeholder="Payment amount"
          />
          <Select
            label="Payment Mode"
            value={editPaymentMode}
            onChange={(event) => setEditPaymentMode(event.target.value)}
            options={[
              { value: "Cash", label: "Cash" },
              { value: "UPI", label: "UPI" },
              { value: "Card", label: "Card" },
              { value: "Bank Transfer", label: "Bank Transfer" },
              { value: "Cheque", label: "Cheque" },
              { value: "Other", label: "Other" },
            ]}
          />
          <DatePicker
            label="Payment Date"
            value={editPaymentDate}
            onChange={(event) => setEditPaymentDate(event.target.value)}
          />
          {String(editPaymentMode).toLowerCase() !== "cash" ? (
            <Input
              label="Transaction ID"
              value={editPaymentTransactionId}
              onChange={(event) => setEditPaymentTransactionId(event.target.value)}
              placeholder="Transaction ID"
            />
          ) : null}
          <Textarea
            label="Payment Note"
            value={editPaymentNote}
            onChange={(event) => setEditPaymentNote(event.target.value)}
            rows={4}
            placeholder="Add payment note"
          />

          {editPaymentError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {editPaymentError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditPaymentDialog} disabled={editPaymentSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitEditedPayment()} disabled={editPaymentSubmitting}>
              {editPaymentSubmitting ? "Updating..." : "Update Payment"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </>
  );
}
