import { useState } from "react";
import {
  Button,
  DialogFooter,
  Input,
  PhoneInput,
  type PhoneInputValue,
} from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";

interface ShareQrModalProps {
  qrLinkName: string;
}

export default function ShareQrModal({ qrLinkName }: ShareQrModalProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>({ countryCode: "+91", number: "", e164Number: "" });

  const handleSend = () => {
    // API integration goes here later
    showToast("Share request queued (Integration pending)", "success");
    closeModal();
  };

  return (
    <div className="p-6">
      <header className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">Share QR Link</h2>
        <p className="mt-1 text-sm text-slate-500">Send '{qrLinkName}' via Email or SMS.</p>
      </header>
      
      <div className="flex flex-col gap-5 mb-6">
        <Input
          label="Email Address"
          placeholder="e.g. user@example.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PhoneInput
          label="Mobile Number"
          value={phoneValue}
          onChange={setPhoneValue}
        />
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={closeModal}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSend} disabled={!email && !phoneValue.number}>
          Send
        </Button>
      </DialogFooter>
    </div>
  );
}
