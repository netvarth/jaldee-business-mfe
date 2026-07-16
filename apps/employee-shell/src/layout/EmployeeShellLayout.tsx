import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Avatar, Button, Drawer } from "@jaldee/design-system";
import {
  LayoutGrid,
  Clock,
  CalendarDays,
  Wallet,
  Menu,
  User,
  FileText,
  Receipt,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useAppStore } from "../store/appStore";
import ShellToastHost from "./ShellToastHost";
import "./employeeShell.css";

export default function EmployeeShellLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const user = useAppStore((state) => state.user);
  const workspace = useAppStore((state) => state.workspace);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = user?.name || "Employee";
  const workspaceName = workspace?.name || "Employee Workspace";
  const workspaceLogoUrl = workspace?.logoUrl;

  const activeClass = "flex flex-col items-center gap-1 text-emerald-700 py-2 px-3 transition-colors no-underline";
  const inactiveClass = "flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 py-2 px-3 transition-colors no-underline";

  return (
    <div className="flex min-h-screen bg-[#f7f9fc] text-slate-900 pb-[76px] md:pb-0">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-20 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar
              name={workspaceName}
              src={workspaceLogoUrl}
              size="lg"
              className="rounded-2xl border border-slate-200 bg-slate-50 text-slate-700"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium leading-tight text-slate-500">{workspaceName}</div>
              <div className="truncate text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Employee Portal</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Avatar name={userName} size="md" />
            <div className="hidden min-w-0 lg:block">
              <div className="truncate text-sm font-black">{userName}</div>
              <div className="truncate text-[11px] font-bold text-slate-400">Signed in</div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void logout()}
              className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-white"
            >
              Logout
            </Button>
          </div>
        </header>

        <div className="employee-content-area min-h-0 flex-1 overflow-y-auto">
          <div className="employee-content-inner">{children}</div>
        </div>
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[190] border-t border-slate-200 bg-white/95 pb-safe pt-2 backdrop-blur-md md:hidden shadow-[0_-4px_20px_rgba(15,23,42,0.04)]">
        <nav className="flex items-center justify-around px-2">
          <NavLink
            to="/me"
            end
            className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
          >
            <LayoutGrid size={20} />
            <span className="text-[10px] font-bold tracking-wider">Overview</span>
          </NavLink>
          <NavLink
            to="/me/attendance"
            className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
          >
            <Clock size={20} />
            <span className="text-[10px] font-bold tracking-wider">Attendance</span>
          </NavLink>
          <NavLink
            to="/me/leave"
            className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
          >
            <CalendarDays size={20} />
            <span className="text-[10px] font-bold tracking-wider">Leave</span>
          </NavLink>
          <NavLink
            to="/me/payslips"
            className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
          >
            <Wallet size={20} />
            <span className="text-[10px] font-bold tracking-wider">Payslips</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 py-2 px-3 border-0 bg-transparent cursor-pointer focus:outline-none"
          >
            <Menu size={20} />
            <span className="text-[10px] font-bold tracking-wider">More</span>
          </button>
        </nav>
      </div>

      {/* Bottom Menu Navigation Drawer */}
      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size="sm"
        title="Employee Portal Menu"
        panelClassName="w-full max-w-full sm:w-96 bg-slate-50"
      >
        <div className="flex flex-col h-full justify-between pb-8">
          <div className="space-y-3 pt-2">
            <div className="px-1 pb-4 mb-4 border-b border-slate-200 flex items-center gap-3">
              <Avatar name={userName} size="md" />
              <div>
                <div className="text-sm font-bold text-slate-900">{userName}</div>
                <div className="text-xs font-semibold text-slate-500">{workspaceName}</div>
              </div>
            </div>

            <NavLink
              to="/me/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors no-underline ${
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950 font-bold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
                }`
              }
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <User size={18} />
              </span>
              <span className="text-sm">My Profile</span>
            </NavLink>

            <NavLink
              to="/me/staffspace"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors no-underline ${
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950 font-bold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
                }`
              }
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FileText size={18} />
              </span>
              <span className="text-sm">StaffSpace</span>
            </NavLink>

            <NavLink
              to="/me/expenses"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors no-underline ${
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950 font-bold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
                }`
              }
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Receipt size={18} />
              </span>
              <span className="text-sm">Expenses</span>
            </NavLink>

            <NavLink
              to="/me/helpdesk"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors no-underline ${
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950 font-bold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
                }`
              }
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <MessageSquare size={18} />
              </span>
              <span className="text-sm">HelpDesk</span>
            </NavLink>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 px-4 py-3 text-red-700 hover:bg-red-50 font-semibold transition-colors cursor-pointer"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <LogOut size={18} />
              </span>
              <span className="text-sm">Log out</span>
            </button>
          </div>
        </div>
      </Drawer>

      <ShellToastHost />
    </div>
  );
}

