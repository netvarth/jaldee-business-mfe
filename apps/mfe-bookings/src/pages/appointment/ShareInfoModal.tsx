import { useState } from "react";
import { Button, Checkbox, Input, Textarea, cn } from "@jaldee/design-system";
import { createPortal } from "react-dom";
import { useBookingApi } from "../../services/useBookingApi";
import { useToast } from "../../contexts/ToastContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingUid: string;
}

export default function ShareInfoModal({ isOpen, onClose, bookingUid }: Props) {
  const api = useBookingApi();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [channels, setChannels] = useState({
    email: false,
    sms: false,
    whatsapp: false,
  });
  const [phoneNo, setPhoneNo] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [email, setEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channels.email && !channels.sms && !channels.whatsapp) {
      showToast("Please select at least one channel to share.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = { customMessage };
      if (channels.sms && phoneNo) payload.phoneNo = phoneNo;
      if (channels.whatsapp && whatsappNo) payload.whatsappNo = whatsappNo;
      if (channels.email && email) payload.email = email;

      await api.put(`/bookings/${bookingUid}/share-info`, payload);
      showToast("Booking info shared successfully", "success");
      onClose();
    } catch (err) {
      showToast("Failed to share booking info", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[500px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-800">Share Booking Info</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Share via</label>
              <div className="flex gap-4">
                <Checkbox
                  label="SMS"
                  checked={channels.sms}
                  onChange={(checked) => setChannels(c => ({ ...c, sms: checked }))}
                />
                <Checkbox
                  label="WhatsApp"
                  checked={channels.whatsapp}
                  onChange={(checked) => setChannels(c => ({ ...c, whatsapp: checked }))}
                />
                <Checkbox
                  label="Email"
                  checked={channels.email}
                  onChange={(checked) => setChannels(c => ({ ...c, email: checked }))}
                />
              </div>
            </div>

            {channels.sms && (
              <Input
                label="Phone Number (SMS)"
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value)}
                placeholder="+1234567890"
              />
            )}

            {channels.whatsapp && (
              <Input
                label="WhatsApp Number"
                value={whatsappNo}
                onChange={(e) => setWhatsappNo(e.target.value)}
                placeholder="+1234567890"
              />
            )}

            {channels.email && (
              <Input
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                type="email"
              />
            )}

            <Textarea
              label="Additional Notes (Optional)"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a custom note to the message..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Share
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
