import { useState, type FormEvent } from "react";
import {
  Button,
  DialogFooter,
  FormSection,
  Input,
  Select,
} from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCreateCustomer, buildOptimisticCustomer } from "../../services/useCreateCustomer";
import type { Customer } from "../../types";

interface CreatePatientModalProps {
  onCreated: (customer: Customer) => void;
  initialCustomer?: Customer;
}

export default function CreatePatientModal({ onCreated, initialCustomer }: CreatePatientModalProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { createCustomer } = useCreateCustomer();
  const [firstName, setFirstName] = useState(initialCustomer?.firstName ?? "");
  const [lastName, setLastName] = useState(initialCustomer?.lastName ?? "");
  const [phone, setPhone] = useState(initialCustomer?.phoneNumber ?? "");
  const [email, setEmail] = useState(initialCustomer?.email ?? "");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const isEditMode = Boolean(initialCustomer);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!firstName || !lastName || !phone) {
      showToast("Please fill First Name, Last Name and Phone.", "error");
      return;
    }
    const input = { firstName, lastName, phoneNumber: phone, email, gender, dob, address };
    onCreated(
      isEditMode
        ? {
            ...initialCustomer,
            firstName,
            lastName,
            phoneNumber: phone,
            email,
          }
        : buildOptimisticCustomer(input),
    );
    showToast(isEditMode ? "Patient record updated" : "Patient record created", "success");
    closeModal();
    if (!isEditMode) {
      void createCustomer(input).catch(() => {});
    }
  };

  return (
    <form data-testid="bookings-create-customer-form" onSubmit={handleSubmit} className="p-6">
      <header className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">{isEditMode ? "Edit Patient Record" : "Create Patient Record"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isEditMode ? "Update patient details in the customer list." : "Save a new patient to the base CRM."}
        </p>
      </header>
      <FormSection title="Patient details">
        <Input id="pat-first-name" data-testid="bookings-create-customer-first-name" label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input id="pat-last-name" data-testid="bookings-create-customer-last-name" label="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Input id="pat-phone" data-testid="bookings-create-customer-phone" label="Phone number" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input id="pat-email" data-testid="bookings-create-customer-email" type="email" label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select id="pat-gender" testId="bookings-create-customer-gender" label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} options={["Male", "Female", "Other"].map((value) => ({ value, label: value }))} />
        <Input id="pat-dob" data-testid="bookings-create-customer-dob" type="date" label="Date of birth" value={dob} onChange={(e) => setDob(e.target.value)} />
        <Input id="pat-address" data-testid="bookings-create-customer-address" label="Address" value={address} onChange={(e) => setAddress(e.target.value)} containerClassName="md:col-span-2" />
      </FormSection>
      <DialogFooter>
        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
        <Button type="submit">Save Record</Button>
      </DialogFooter>
    </form>
  );
}
