import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useAppStore } from "../store/appStore";
import "./employeeShell.css";

const HR_MENU = [
  { label: "Attendance", path: "/hr/attendance" },
  { label: "Leave", path: "/hr/leave" },
  { label: "StaffSpace", path: "/hr/announcements" },
  { label: "Payroll", path: "/hr/payroll" },
  { label: "Expenses", path: "/hr/expenses" },
  { label: "Helpdesk", path: "/hr/tickets" },
  { label: "My HR", path: "/hr/me" },
];

export default function EmployeeShellLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout } = useAuth();
  const user = useAppStore((state) => state.user);
  const workspace = useAppStore((state) => state.workspace);

  return (
    <div className={`employee-shell ${sidebarCollapsed ? "employee-shell-sidebar-collapsed" : ""}`}>
      <header className="employee-topbar">
        <div className="employee-topbar-left">
          <button
            type="button"
            className="employee-sidebar-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "Show HR menu" : "Hide HR menu"}
            aria-expanded={!sidebarCollapsed}
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <p className="employee-topbar-kicker">Account</p>
            <h2>{workspace?.name || "Employee Workspace"}</h2>
          </div>
        </div>
        <div className="employee-user">
          <div className="employee-user-meta">
            <span>{user?.name || "Employee"}</span>
            <small>{user?.email || "Signed in"}</small>
          </div>
          <button type="button" onClick={() => void logout()} className="employee-logout">
            Logout
          </button>
        </div>
      </header>

      <div className="employee-body">
        <aside className="employee-sidebar" aria-label="HR menu">
          <nav className="employee-menu">
            {HR_MENU.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/hr"}
                className={({ isActive }) => `employee-menu-link ${isActive ? "employee-menu-link-active" : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="employee-content">
          {children}
        </main>
      </div>
    </div>
  );
}
