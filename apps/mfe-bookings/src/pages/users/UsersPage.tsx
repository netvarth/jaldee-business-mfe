import { useState } from "react";
import { useUsers } from "../../services/useUsers";
import { useModal } from "../../contexts/ModalContext";
import CreateUserModal from "./CreateUserModal";

/** Faithful port of the vanilla #page-users (booking Users — not HR employees). */
export default function UsersPage() {
  const { users, loading, refresh } = useUsers();
  const { openModal } = useModal();
  const [query, setQuery] = useState("");

  const filtered = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(query.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section id="page-users" className="page-section active" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="calendars-list-toolbar">
        <div className="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
          <input type="text" placeholder="Search Users" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="filters-wrapper">
          <button className="btn btn-primary" onClick={() => openModal(<CreateUserModal onCreated={() => refresh()} />)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
            Create User
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table" id="users-table">
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Name</th>
              <th>Title/Role</th>
              <th>Login</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--light-text)" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--light-text)" }}>No users found.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.userUid}>
                  <td style={{ fontWeight: 600 }}>{u.displayName}</td>
                  <td>{`${u.firstName} ${u.lastName}`.trim()}</td>
                  <td>{u.title || "-"}</td>
                  <td>
                    {u.hasLogin
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "2px 8px", borderRadius: 10 }}>Login · CRM</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 10 }}>Booking only</span>}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: u.status === "Active" ? "#065f46" : "#92400e", background: u.status === "Active" ? "#d1fae5" : "#fef3c7", padding: "2px 8px", borderRadius: 10 }}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
