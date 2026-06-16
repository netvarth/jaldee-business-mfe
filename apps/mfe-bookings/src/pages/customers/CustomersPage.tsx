import { useState } from "react";
import { useCustomers } from "../../services/useCustomers";
import { useModal } from "../../contexts/ModalContext";
import CreatePatientModal from "./CreatePatientModal";
import type { Customer } from "../../types";

/**
 * Faithful port of the vanilla `#page-customers` screen — same markup and the
 * original `style.css` classes (data-grid, customer-name-cell, customer-avatar,
 * c-name, badge, btn-grid-action, …). Only the JS innerHTML row-building is
 * replaced by React rendering over live data (useCustomers).
 */

function fullName(c: Customer): string {
  return `${c.firstName} ${c.lastName}`.trim() || "Unknown";
}

export default function CustomersPage() {
  const { customers, loading, addLocal } = useCustomers();
  const { openModal } = useModal();
  const [query, setQuery] = useState("");

  const filtered = customers.filter((c) => {
    const q = query.toLowerCase();
    return (
      fullName(c).toLowerCase().includes(q) ||
      (c.phoneNumber ?? "").toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <section
      id="page-customers"
      className="page-section active"
      style={{ backgroundColor: "var(--app-bg)", padding: 0, flexDirection: "column", display: "flex" }}
    >
      <div className="customers-header">
        <div className="customers-tabs">
          <div className="customer-tab active">Patients ({customers.length})</div>
          <div className="customer-tab">Inactive</div>
          <div className="customer-tab">Groups</div>
        </div>
      </div>

      <div className="customers-toolbar">
        <div style={{ display: "flex", gap: 12, flex: 1 }}>
          <div className="c-search-bar">
            <select className="c-search-select"><option>All</option></select>
            <input
              type="text"
              placeholder="Enter name or phone or id"
              className="c-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <svg className="c-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
          </div>
          <div className="c-filter-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--primary-color)" stroke="none"><path d="M3 4c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v2.5c0 .6-.2 1.1-.6 1.5L14 14.2V21c0 .8-.5 1.4-1.2 1.8l-2 1c-1 .5-2.2-.2-2.2-1.3v-8.3L3.6 8A2.2 2.2 0 0 1 3 6.5V4z" /></svg>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => openModal(<CreatePatientModal onCreated={addLocal} />)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
          Create Customer
        </button>
      </div>

      <div className="customers-table-container">
        <table className="data-grid">
          <thead>
            <tr>
              <th style={{ width: 48, textAlign: "center" }}><input type="checkbox" /></th>
              <th>Patient Name &amp; ID</th>
              <th>Phone</th>
              <th>Labels</th>
              <th>Visits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="customers-table-body">
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--light-text)" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--light-text)" }}>No customers found.</td></tr>
            ) : (
              filtered.map((c) => {
                const name = fullName(c);
                return (
                  <tr key={c.id}>
                    <td style={{ textAlign: "center" }}><input type="checkbox" /></td>
                    <td>
                      <div className="customer-name-cell">
                        <div className="customer-avatar" style={{ backgroundColor: c.avatarColor ?? "#3b82f6" }}>
                          {name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <span className="c-name">{name}</span>
                          <span className="c-id">{c.id || "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{c.phoneNumber || "-"}</td>
                    <td>
                      {c.labels.length ? c.labels.map((l) => <span key={l} className="badge">{l}</span>) : "-"}
                    </td>
                    <td>{c.visits}</td>
                    <td>
                      <div className="c-actions">
                        <button className="btn-grid-action">View</button>
                        <button className="btn-grid-action">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          Edit
                        </button>
                        <button className="btn-grid-action" style={{ padding: 6 }}>…</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
