import React, { useState } from "react";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCreateCustomer, buildOptimisticCustomer } from "../../services/useCreateCustomer";
import type { Customer } from "../../types";

/**
 * Faithful port of the vanilla `#modal-create-patient` form (modal-card, form-row,
 * form-group, custom-select, btn-primary/secondary). Posts to /customers and
 * hands the new record back so the list updates immediately.
 */
export default function CreatePatientModal({ onCreated }: { onCreated: (c: Customer) => void }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { createCustomer } = useCreateCustomer();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) {
      showToast("Please fill First Name, Last Name and Phone.", "error");
      return;
    }
    const input = { firstName, lastName, phoneNumber: phone, email, gender, dob, address };
    // Optimistic: show the record instantly, then persist in the background so
    // the UI never blocks on the network (and still works with no backend).
    onCreated(buildOptimisticCustomer(input));
    showToast("Patient record created", "success");
    closeModal();
    void createCustomer(input).catch(() => {});
  };

  return (
    <div className="modal-card">
      <div className="modal-header">
        <div>
          <h3 className="modal-title">Create Patient Record</h3>
          <p className="modal-subtitle">Save a new patient info to basic crm</p>
        </div>
        <button className="modal-close-btn" onClick={closeModal}>&times;</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pat-first-name">First Name <span className="required">*</span></label>
              <input type="text" id="pat-first-name" required placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="pat-last-name">Last Name <span className="required">*</span></label>
              <input type="text" id="pat-last-name" required placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pat-phone">Phone Number <span className="required">*</span></label>
              <input type="text" id="pat-phone" required placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="pat-email">Email Address</label>
              <input type="email" id="pat-email" placeholder="john.doe@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pat-gender">Gender</label>
              <select id="pat-gender" className="custom-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="pat-dob">Date of Birth</label>
              <input type="date" id="pat-dob" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="pat-address">Address</label>
            <input type="text" id="pat-address" placeholder="123 Street Name, Town" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save Record</button>
        </div>
      </form>
    </div>
  );
}
