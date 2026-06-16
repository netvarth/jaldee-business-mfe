import { NavLink } from "react-router-dom";
import { cn } from "@jaldee/design-system";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  X,
  FileText,
  CreditCard,
} from "./icons";

interface NavItem {
  label: string;
  icon: (p: { size?: number; className?: string }) => JSX.Element;
  to: string;
  end?: boolean;
}

const NAV: NavItem[] = [
  { label: "Calendar", icon: Calendar, to: "/", end: true },
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Calendars", icon: Calendar, to: "/calendars" },
  { label: "Customers", icon: Users, to: "/customers" },
  { label: "Services", icon: FileText, to: "/services" },
  { label: "Staff", icon: CreditCard, to: "/users" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 w-[220px] bg-slate-900 text-slate-400 flex flex-col z-50 transition-transform lg:translate-x-0 h-full",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Jaldee</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold leading-none">
              Booking Module
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 lg:hidden text-slate-400 hover:bg-slate-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 mt-6 space-y-1 overflow-y-auto px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all group rounded-lg font-medium",
                  isActive ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-slate-200"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    className={cn(
                      isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
