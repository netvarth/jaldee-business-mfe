import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  Receipt,
  Wallet,
  Calendar,
  MoreHorizontal,
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  UserX,
  Laptop,
  Settings as SettingsIcon,
} from "lucide-react";
import { Popover } from "@jaldee/design-system";

const MAIN_NAV_ITEMS = [
  { key: "attendance", route: "/attendance", label: "Attendance", Icon: CalendarCheck },
  { key: "payroll", route: "/payroll", label: "Payroll", Icon: Receipt },
  { key: "expenses", route: "/expenses", label: "Expenses", Icon: Wallet },
  { key: "leave", route: "/leave", label: "Leave", Icon: Calendar },
];

const MORE_NAV_ITEMS = [
  { key: "dashboard", route: "/", label: "Dashboard", Icon: LayoutDashboard },
  { key: "employees", route: "/employees", label: "Employees", Icon: Users },
  { key: "org", route: "/org", label: "Organization", Icon: Building2 },
  { key: "recruitment", route: "/recruitment", label: "Recruitment", Icon: Briefcase },
  { key: "separation", route: "/separation", label: "Separation", Icon: UserX },
  { key: "assets", route: "/assets", label: "Assets", Icon: Laptop },
  { key: "settings", route: "/settings", label: "Settings", Icon: SettingsIcon },
];

const DEDICATED_MOBILE_NAV_PATHS = ["/recruitment", "/org", "/settings"];

export function GlobalHrMobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const pathname = location.pathname;

  // Hide global footer on section pages that render their own dedicated bottom footer
  const isDedicatedSection = DEDICATED_MOBILE_NAV_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  // Also hide on Employee Details page which renders its own bottom footer
  const isEmployeeDetails = /^\/employees\/[^/]+/.test(pathname) && pathname !== "/employees/new";

  if (isDedicatedSection || isEmployeeDetails) {
    return null;
  }

  const activeMainItem = MAIN_NAV_ITEMS.find((item) =>
    pathname === item.route || pathname.startsWith(`${item.route}/`)
  );

  const activeMoreItem = MORE_NAV_ITEMS.find((item) => {
    if (item.route === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname === item.route || pathname.startsWith(`${item.route}/`);
  });

  const isMoreActive = !activeMainItem && Boolean(activeMoreItem);

  return (
    <nav
      id="hr-global-mobile-footer"
      data-testid="hr-global-mobile-footer"
      className="mobile-bottom-nav"
      aria-label="HR Mobile navigation"
    >
      {MAIN_NAV_ITEMS.map(({ key, route, label, Icon }) => {
        const isActive = pathname === route || pathname.startsWith(`${route}/`);
        return (
          <button
            key={key}
            type="button"
            id={`hr-global-nav-mobile-${key}`}
            data-testid={`hr-global-nav-mobile-${key}`}
            className="mobile-bottom-nav__item"
            data-active={isActive}
            onClick={() => navigate(route)}
          >
            <span className="mobile-bottom-nav__icon">
              <Icon size={18} />
            </span>
            <span className="mobile-bottom-nav__label">{label}</span>
          </button>
        );
      })}

      {/* 5th ITEM: MORE MENU POPOVER */}
      <Popover
        portal
        open={moreOpen}
        onOpenChange={setMoreOpen}
        placement="top"
        align="end"
        contentClassName="!w-52 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
        trigger={
          <button
            type="button"
            id="hr-global-nav-mobile-more"
            data-testid="hr-global-nav-mobile-more"
            className="mobile-bottom-nav__item"
            data-active={isMoreActive}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <span className="mobile-bottom-nav__icon">
              <MoreHorizontal size={18} />
            </span>
            <span className="mobile-bottom-nav__label">
              {isMoreActive ? activeMoreItem?.label || "More" : "More"}
            </span>
          </button>
        }
      >
        <div className="flex flex-col w-full py-1">
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--light-text)] border-b border-[var(--border-color)]">
            HR Modules
          </div>
          {MORE_NAV_ITEMS.map(({ key, route, label, Icon }) => {
            const isActive =
              route === "/"
                ? pathname === "/" || pathname === ""
                : pathname === route || pathname.startsWith(`${route}/`);
            return (
              <button
                key={key}
                type="button"
                id={`hr-global-nav-mobile-${key}`}
                data-testid={`hr-global-nav-mobile-${key}`}
                className="w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 hover:bg-[var(--primary-light)] transition-colors"
                style={{
                  color: isActive ? "var(--primary-color)" : "var(--dark-text)",
                  background: isActive ? "rgba(17,94,89,0.06)" : "transparent",
                }}
                onClick={() => {
                  navigate(route);
                  setMoreOpen(false);
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </Popover>
    </nav>
  );
}
