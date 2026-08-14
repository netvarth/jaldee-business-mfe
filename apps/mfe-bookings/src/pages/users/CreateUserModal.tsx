import { useState, type FormEvent } from "react";
import {
  Button,
  DialogFooter,
  FormSection,
  Input,
  PhoneInput,
  Select,
  Switch,
  type PhoneInputValue,
} from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCreateUser } from "../../services/useCreateUser";
import type { BookingUser } from "../../data/sessionStore";

const EMPTY_PHONE: PhoneInputValue = { countryCode: "+91", number: "", e164Number: "" };

function isValidPhone(value: PhoneInputValue) {
  const digits = value.number.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export default function CreateUserModal({ onCreated }: { onCreated: (user: BookingUser) => void }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { createUser, submitting } = useCreateUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("Dr.");
  const [status, setStatus] = useState<BookingUser["status"]>("Active");
  const [email, setEmail] = useState("");
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(EMPTY_PHONE);
  const [connectToCrm, setConnectToCrm] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (hasSubmitted) return;

    if (!firstName || !lastName) {
      showToast("First and last name are required", "error");
      return;
    }
    if (!email.trim() && !phoneValue.number.trim()) {
      showToast("Email or phone is required", "error");
      return;
    }
    if (phoneValue.number.trim() && !isValidPhone(phoneValue)) {
      showToast("Phone must be a valid mobile number", "error");
      return;
    }
    
    setHasSubmitted(true);
    try {
      const user = await createUser({
        firstName,
        lastName,
        title,
        status,
        email,
        phoneNumber: phoneValue.e164Number || "",
        connectToCrm,
      });
      onCreated(user);
      showToast(connectToCrm ? "Booking user created with login access" : "Booking user created", "success");
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create user", "error");
      setHasSubmitted(false);
    }
  };

  return (
    <form data-testid="bookings-create-user-form" onSubmit={handleSubmit} className="p-6">
      <header className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">Add Staff</h2>
        <p className="mt-1 text-sm text-slate-500">Add a professional or staff member.</p>
      </header>
      <FormSection title="Staff details">
        <Input id="usr-first-name" data-testid="bookings-create-user-first-name" label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input id="usr-last-name" data-testid="bookings-create-user-last-name" label="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Select id="usr-title" testId="bookings-create-user-title" label="Title / prefix" value={title} onChange={(e) => setTitle(e.target.value)} options={["Dr.", "Mr.", "Ms.", "Mrs."].map((value) => ({ value, label: value }))} />
        <Select id="usr-status" testId="bookings-create-user-status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={["Active", "Inactive"].map((value) => ({ value, label: value }))} />
      </FormSection>
      <div className="my-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Switch label="Allow login" checked={connectToCrm} onChange={setConnectToCrm} />
        <p className="mt-2 text-xs text-slate-500">Enable login access for this staff member. Leave off for a booking-only provider.</p>
      </div>
      <FormSection title="Contact details">
        <Input id="usr-email" data-testid="bookings-create-user-email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PhoneInput
          id="usr-phone"
          testId="bookings-create-user-phone"
          label="Phone"
          value={phoneValue}
          onChange={setPhoneValue}
        />
      </FormSection>
      <DialogFooter>
        <Button variant="secondary" onClick={closeModal} disabled={hasSubmitted}>
          Cancel
        </Button>
        <Button type="submit" disabled={hasSubmitted} loading={submitting}>Add Staff</Button>
      </DialogFooter>
    </form>
  );
}
