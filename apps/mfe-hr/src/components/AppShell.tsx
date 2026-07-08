import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import {
  BriefcaseBusiness,
  LogOut,
  Search,
} from "lucide-react";
import { Icon, type IconName } from "@jaldee/design-system";

const NAV = [
  { to: "/", label: "Dashboard", iconName: "layers", end: true },
  { to: "/employees", label: "Employee Master", iconName: "list" },
  { to: "/org", label: "Organization", iconName: "warehouse" },
  { to: "/separation", label: "Separation", iconName: "history" },
  { to: "/assets", label: "Assets", iconName: "box" },
  { to: "/attendance", label: "Attendance", iconName: "calendar" },
  { to: "/leave", label: "Leave", iconName: "calendar" },
  { to: "/announcements", label: "StaffSpace", iconName: "alert" },
  { to: "/payroll", label: "Payroll", iconName: "database" },
  { to: "/expenses", label: "Expenses", iconName: "cart" },
  { to: "/tickets", label: "Helpdesk", iconName: "alert" },
  { to: "/grievances", label: "Grievances", iconName: "alert" },
  { to: "/posh", label: "POSH", iconName: "alert" },
  { to: "/recruitment", label: "Recruitment", iconName: "search" },
  { to: "/recruitment/careers", label: "Careers", iconName: "globe" },
  { to: "/reports", label: "Reports", iconName: "chart" },
  { to: "/settings", label: "Settings", iconName: "filter" },
];

const navClass = (isActive: boolean) =>
  [
    "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold transition-colors",
    isActive
      ? "border-teal-200 bg-white text-slate-900 shadow-sm"
      : "border-transparent text-slate-500 hover:bg-white hover:text-slate-900",
  ].join(" ");

export default function AppShell({ children }: { children: ReactNode }) {
  const { account, user } = useMFEProps();
  const accountName = account?.name ?? "Jaldee HR";
  const initials = getInitials(accountName);

  return (
    <div id="hr-app-shell" data-testid="hr-app-shell" className="flex h-full min-h-[calc(100vh-56px)] bg-[#f7f9fc] text-slate-900">
      <aside id="hr-app-sidebar" data-testid="hr-app-sidebar" className="flex w-[292px] shrink-0 flex-col border-r border-slate-200 bg-[#f8fafc] px-4 py-5">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2e6f67] text-white shadow-sm">
            <BriefcaseBusiness size={20} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-black tracking-tight">Jaldee HR</div>
            <div className="truncate text-xs font-semibold text-slate-400">{accountName}</div>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {NAV.map((item) => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => navClass(isActive)}
              >
                {({ isActive }) => (
                  <div data-testid={`hr-sidebar-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`} data-active={isActive ? "true" : "false"} className="contents">
                    <NavIcon item={item} />
                    <span>{item.label}</span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <button
          id="hr-app-logout"
          data-testid="hr-app-logout"
          type="button"
          className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <main id="hr-app-main" data-testid="hr-app-main" className="flex min-w-0 flex-1 flex-col">
        <header id="hr-app-topbar" data-testid="hr-app-topbar" className="flex h-20 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-8">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="hr-app-search"
              data-testid="hr-app-search"
              type="search"
              placeholder="Search everything..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-teal-300 focus:bg-white"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-slate-50 p-1">
              <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
                Admin View
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6d44b8] text-sm font-black text-white">
              {initials}
            </div>
            <div className="hidden min-w-0 lg:block">
              <div className="truncate text-sm font-black">{user?.name ?? "Admin User"}</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Admin</div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

function NavIcon({ item }: { item: (typeof NAV)[number] }) {
  return <Icon name={item.iconName as IconName} className="h-[18px] w-[18px]" aria-hidden="true" />;
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
