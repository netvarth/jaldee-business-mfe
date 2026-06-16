import React, { useState } from "react";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCreateUser } from "../../services/useCreateUser";
import type { BookingUser } from "../../data/sessionStore";

/**
 * Faithful port of the vanilla #modal-create-user, extended with the
 * "Connect to base CRM" option. When connected, the backend provisions a
 * central login (core-auth-service) for the user; when not, only a
 * booking-local provider is created (no login).
 */
export default function CreateUserModal({ onCreated }: { onCreated: (u: BookingUser) => void }) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { createUser, submitting } = useCreateUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("Dr.");
  const [status, setStatus] = useState("Active");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [connectToCrm, setConnectToCrm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) { showToast("First and last name are required", "error"); return; }
    if (connectToCrm && !email && !phone) { showToast("Email or phone is required for a login", "error"); return; }
    const user = await createUser({ firstName, lastName, title, status, email, phoneNumber: phone, connectToCrm });
    onCreated(user);
    showToast(connectToCrm ? "User created with login (base CRM)" : "Booking user created (no login)", "success");
    closeModal();
  };

  return (
    <div className="modal-card">
      <div className="modal-header">
        <div>
          <h3 className="modal-title">Create User</h3>
          <p className="modal-subtitle">Add a new professional / staff user</p>
        </div>
        <button className="modal-close-btn" onClick={closeModal}>&times;</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-row mb-3">
            <div className="form-group">
              <label htmlFor="usr-first-name">First Name <span className="required">*</span></label>
              <input type="text" id="usr-first-name" required placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="usr-last-name">Last Name <span className="required">*</span></label>
              <input type="text" id="usr-last-name" required placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="form-row mb-3">
            <div className="form-group">
              <label htmlFor="usr-title">Title / Prefix</label>
              <select id="usr-title" className="custom-select" value={title} onChange={(e) => setTitle(e.target.value)}>
                <option value="Dr.">Dr.</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="usr-status">Status</label>
              <select id="usr-status" className="custom-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Connect to base CRM */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid var(--border-color)", marginBottom: connectToCrm ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Connect to Base CRM</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Provisions a central account so this user can log in. Leave off for a booking-only provider.</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={connectToCrm} onChange={(e) => setConnectToCrm(e.target.checked)} />
              <span className="slider" />
            </label>
          </div>

          {connectToCrm && (
            <div className="form-row mb-3">
              <div className="form-group">
                <label htmlFor="usr-email">Email <span className="required">*</span></label>
                <input type="email" id="usr-email" placeholder="john.doe@clinic.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="usr-phone">Phone</label>
                <input type="text" id="usr-phone" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
