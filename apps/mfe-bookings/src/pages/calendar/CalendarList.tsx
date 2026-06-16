import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCalendars } from "../../services/useCalendars";

interface CalRow {
  uid?: string;
  id?: string;
  name: string;
  description?: string;
  status?: string;
  location?: string;
  color?: string;
  channels?: string[];
}

const CHANNEL_ICON: Record<string, string> = { Online: "🖥️", "Walk-in": "📍", "Phone-in": "📞" };

function badgeClass(status?: string) {
  if (status === "Draft") return "badge badge-draft";
  if (status === "Inactive") return "badge badge-inactive";
  return "badge badge-active";
}

/** Faithful port of vanilla #page-calendars (data-table, not cards). */
export default function CalendarList() {
  const { calendars, loading } = useCalendars();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const rows = calendars as unknown as CalRow[];
  const filtered = rows.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section id="page-calendars" data-testid="bookings-calendar-list-page" className="page-section active" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div className="calendars-list-toolbar">
        <div className="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
          <input id="bookings-calendar-list-search" data-testid="bookings-calendar-list-search" type="text" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="filters-wrapper">
          <select id="bookings-calendar-list-users-filter" data-testid="bookings-calendar-list-users-filter" className="custom-select"><option value="">Users</option></select>
          <select id="bookings-calendar-list-location-filter" data-testid="bookings-calendar-list-location-filter" className="custom-select"><option value="">All Location</option></select>
          <button id="bookings-calendar-list-create" data-testid="bookings-calendar-list-create" className="btn btn-primary" onClick={() => navigate("/calendars/create")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
            Create Calendar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table" id="calendars-table" data-testid="bookings-calendars-table">
          <thead>
            <tr>
              <th>Calendar Name</th>
              <th>Location</th>
              <th>Booking Channel</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-6" style={{ color: "#64748B", textAlign: "center", padding: 24 }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ color: "#64748B", textAlign: "center", padding: 24 }}>No calendars match the search criteria.</td></tr>
            ) : (
              filtered.map((c) => {
                const channels = c.channels && c.channels.length ? c.channels : ["Online", "Walk-in"];
                return (
                  <tr key={c.uid || c.id} data-testid={`bookings-calendar-row-${c.uid || c.id}`} style={{ cursor: "pointer" }} onClick={() => navigate("/calendars/details")}>
                    <td className="bold">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c.color || "#9333EA" }} />
                        <div>
                          <span>{c.name}</span>
                          <div style={{ fontSize: 11, fontWeight: "normal", color: "#64748B", marginTop: 2 }}>{c.description || "No description"}</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.location || "Thrissur"}</td>
                    <td>
                      <div className="channel-chips-row">
                        {channels.map((ch) => (
                          <span key={ch} className="channel-chip">{CHANNEL_ICON[ch] ?? "🖥️"} {ch}</span>
                        ))}
                      </div>
                    </td>
                    <td><span className={badgeClass(c.status)}>{c.status || "Active"}</span></td>
                    <td>
                      <button
                        id={`bookings-calendar-edit-${c.uid || c.id}`}
                        data-testid={`bookings-calendar-edit-${c.uid || c.id}`}
                        className="btn btn-secondary btn-xs"
                        onClick={(e) => { e.stopPropagation(); navigate("/calendars/edit"); }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button id="bookings-calendar-list-prev" data-testid="bookings-calendar-list-prev" className="page-nav-btn" disabled>Prev</button>
        <button id="bookings-calendar-list-page-1" data-testid="bookings-calendar-list-page-1" data-active="true" className="page-num active">1</button>
        <button id="bookings-calendar-list-page-2" data-testid="bookings-calendar-list-page-2" data-active="false" className="page-num">2</button>
        <button id="bookings-calendar-list-page-3" data-testid="bookings-calendar-list-page-3" data-active="false" className="page-num">3</button>
        <button id="bookings-calendar-list-next" data-testid="bookings-calendar-list-next" className="page-nav-btn">Next</button>
      </div>
    </section>
  );
}
