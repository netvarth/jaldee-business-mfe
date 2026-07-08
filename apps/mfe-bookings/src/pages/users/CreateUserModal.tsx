import { useState, type FormEvent } from "react";
import {
  Button,
  DialogFooter,
  FormSection,
  Input,
  Select,
  Switch,
} from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCreateUser } from "../../services/useCreateUser";
import type { BookingUser } from "../../data/sessionStore";

export default function CreateUserModal({ onCreated }: { onCreated: (user: BookingUser) => void }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { createUser, submitting } = useCreateUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("Dr.");
  const [status, setStatus] = useState<BookingUser["status"]>("Active");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [connectToCrm, setConnectToCrm] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!firstName || !lastName) {
      showToast("First and last name are required", "error");
      return;
    }
    if (connectToCrm && !email && !phone) {
      showToast("Email or phone is required for a login", "error");
      return;
    }
    const user = await createUser({ firstName, lastName, title, status, email, phoneNumber: phone, connectToCrm });
    onCreated(user);
    showToast(connectToCrm ? "User created with login (base CRM)" : "Booking user created (no login)", "success");
    closeModal();
  };

  return (
    <form data-testid="bookings-create-user-form" onSubmit={handleSubmit} className="p-6">
      <header className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">Create User</h2>
        <p className="mt-1 text-sm text-slate-500">Add a professional or staff user.</p>
      </header>
      <FormSection title="User details">
        <Input id="usr-first-name" data-testid="bookings-create-user-first-name" label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input id="usr-last-name" data-testid="bookings-create-user-last-name" label="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Select id="usr-title" testId="bookings-create-user-title" label="Title / prefix" value={title} onChange={(e) => setTitle(e.target.value)} options={["Dr.", "Mr.", "Ms.", "Mrs."].map((value) => ({ value, label: value }))} />
        <Select id="usr-status" testId="bookings-create-user-status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={["Active", "Inactive"].map((value) => ({ value, label: value }))} />
      </FormSection>
      <div className="my-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Switch label="Connect to Base CRM" checked={connectToCrm} onChange={setConnectToCrm} />
        <p className="mt-2 text-xs text-slate-500">Provisions a central account. Leave off for a booking-only provider.</p>
      </div>
      {connectToCrm && (
        <FormSection title="Login details">
          <Input id="usr-email" data-testid="bookings-create-user-email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input id="usr-phone" data-testid="bookings-create-user-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormSection>
      )}
      <DialogFooter>
        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
        <Button type="submit" loading={submitting}>Create User</Button>
      </DialogFooter>
    </form>
  );
}
