import { useEffect } from "react";
import type { ReactNode, SVGProps } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import type { ProductKey } from "../store/shellStore";
import { SETTINGS_MENU_GROUPS } from "./sidebarConfig";
import { themeService } from "../theme/ThemeService";

const PRODUCT_CONFIG: Record<ProductKey, { label: string; icon: ReactNode }> = {
  health: { label: "Health", icon: <ShieldMedicalIcon /> },
  bookings: { label: "Bookings", icon: <CalendarIcon /> },
  golderp: { label: "Gold ERP", icon: <BriefcaseIcon /> },
  karty: { label: "Karty", icon: <CartIcon /> },
  finance: { label: "Finance", icon: <BankIcon /> },
  lending: { label: "Lending", icon: <TrendIcon /> },
  hr: { label: "HR", icon: <UsersIcon /> },
  ai: { label: "AI", icon: <SparklesIcon /> },
};

const PRODUCT_ORDER: ProductKey[] = [
  "health",
  "bookings",
  "golderp",
  "karty",
  "finance",
  "lending",
  "hr",
  "ai",
];

const PRODUCT_HOME_PATHS: Partial<Record<ProductKey, string>> = {
  karty: "/karty/orders/dashboard",
};

const BASE_CRM_PATH_PREFIXES = [
  "/customers",
  "/users",
  "/reports",
  "/drive",
  "/tasks",
  "/membership",
  "/leads",
  "/jaldee-leads",
  "/audit-log",
  "/ivr",
];

interface IconRailProps {
  submenuVisible: boolean;
  collapseOnSelect: boolean;
  onRailNavigate: () => void;
  onSubmenuSelection: () => void;
}

export default function IconRail({
  submenuVisible,
  collapseOnSelect,
  onRailNavigate,
  onSubmenuSelection,
}: IconRailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const account = useShellStore((s) => s.account);
  const activeProduct = useShellStore((s) => s.activeProduct);
  const setActiveProduct = useShellStore((s) => s.setActiveProduct);
  const setSidebarVisible = useShellStore((s) => s.setSidebarVisible);

  useEffect(() => {
    if (activeProduct) {
      themeService.applyProductAccent(activeProduct);
    } else {
      themeService.clearProductAccent();
    }
  }, [activeProduct]);

  if (!account) return null;

  useEffect(() => {
    if (location.pathname === "/settings" || location.pathname.startsWith("/settings/")) {
      setActiveProduct(null);
      return;
    }

    const isBaseCrmRoute = BASE_CRM_PATH_PREFIXES.some((path) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );

    if (isBaseCrmRoute) {
      setActiveProduct(null);
      return;
    }

    const visibleProducts = new Set<ProductKey>([...account.licensedProducts, "hr"]);
    const matchedProduct = PRODUCT_ORDER.find((key) =>
      visibleProducts.has(key) &&
      location.pathname.startsWith(`/${key}`)
    );

    if (matchedProduct) {
      setActiveProduct(matchedProduct);
      return;
    }

    if (location.pathname === "/home" || location.pathname === "/base" || location.pathname === "/") {
      setActiveProduct(null);
    }
  }, [account.licensedProducts, location.pathname, setActiveProduct]);

  function handleNavigate(key: ProductKey) {
    onRailNavigate();
    setActiveProduct(key);
    setSidebarVisible(true);
    navigate(PRODUCT_HOME_PATHS[key] ?? `/${key}`);
  }

  function handleBase() {
    onRailNavigate();
    setActiveProduct(null);
    setSidebarVisible(true);
    navigate("/home");
  }

  function handleBaseCrm() {
    onRailNavigate();
    setActiveProduct(null);
    setSidebarVisible(true);
    navigate("/customers");
  }

  function handleSettings() {
    onRailNavigate();
    setActiveProduct(null);
    setSidebarVisible(true);
    navigate("/settings");
  }

  function handleSubmenuNavigate(path: string) {
    navigate(path);
    if (window.innerWidth <= 1024 || collapseOnSelect) {
      setSidebarVisible(false);
    }
    onSubmenuSelection();
  }

  const isActive = (key: string) => location.pathname.startsWith(`/${key}`);
  const isBaseCrmActive = BASE_CRM_PATH_PREFIXES.some((path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const licensedProducts = PRODUCT_ORDER.filter((key) => key === "hr" || account.licensedProducts.includes(key));

  return (
    <div className="icon-rail-wrapper" data-product={activeProduct ?? "default"}>
      <div
        data-testid="icon-rail"
        className="icon-rail"
        data-product={activeProduct ?? "default"}
      >
      <div
        data-testid="icon-rail-logo"
        className="icon-rail-logo"
        onClick={handleBase}
      >
        <SparklesIcon />
      </div>

      {licensedProducts.map((key) => {
        const config = PRODUCT_CONFIG[key];
        if (!config) return null;

        return (
          <RailItem
            key={key}
            id={`icon-rail-item-${key}`}
            product={key}
            icon={config.icon}
            label={config.label}
            active={isActive(key)}
            onClick={() => handleNavigate(key)}
          />
        );
      })}

      <RailItem
        id="icon-rail-item-basecrm"
        product="default"
        icon={<BaseCrmIcon />}
        label="Base CRM"
        active={isBaseCrmActive}
        onClick={handleBaseCrm}
      />

      <div className="icon-rail-spacer" />

      <RailItem
        id="icon-rail-item-settings"
        product="default"
        icon={<SettingsIcon />}
        label="Settings"
        active={location.pathname.startsWith("/settings")}
        onClick={handleSettings}
      />
    </div>
    {location.pathname.startsWith("/settings") && submenuVisible && (
      <SettingsPanel
        accountName={account?.name ?? "Jaldee Business"}
        currentPath={location.pathname}
        groups={SETTINGS_MENU_GROUPS}
        onNavigate={handleSubmenuNavigate}
      />
    )}
  </div>
);
}

interface RailItemProps {
  id: string;
  product: ProductKey | "default";
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function RailItem({ id, product, icon, label, active, onClick }: RailItemProps) {
  return (
    <div
      id={id}
      data-testid={id}
      data-product={product}
      data-active={active}
      onClick={onClick}
      title={label}
      className="icon-rail-item"
    >
      <span className="icon-rail-item-icon">{icon}</span>
      <span className="icon-rail-item-label" data-active={active}>
        {label}
      </span>
    </div>
  );
}

function RailSvg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

function CalendarIcon() {
  return <RailSvg><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M4 10h16" /></RailSvg>;
}

function ShieldMedicalIcon() {
  return <RailSvg><path d="M12 3 19 6v6c0 4.5-2.8 7.7-7 9-4.2-1.3-7-4.5-7-9V6l7-3Z" /><path d="M12 8v7" /><path d="M8.5 11.5h7" /></RailSvg>;
}

function CartIcon() {
  return <RailSvg><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /><path d="M3 5h2l2.2 9.5a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H7" /></RailSvg>;
}

function TrendIcon() {
  return <RailSvg><path d="m4 16 5-5 4 4 7-7" /><path d="M14 8h6v6" /></RailSvg>;
}

function BankIcon() {
  return <RailSvg><path d="M3 9 12 4l9 5" /><path d="M5 10v8" /><path d="M9.5 10v8" /><path d="M14.5 10v8" /><path d="M19 10v8" /><path d="M3 20h18" /></RailSvg>;
}

function BriefcaseIcon() {
  return <RailSvg><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></RailSvg>;
}

function UsersIcon() {
  return <RailSvg><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="3" /><path d="M20 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 4.13a3 3 0 0 1 0 5.74" /></RailSvg>;
}

function SparklesIcon() {
  return <RailSvg><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1L6.5 8.5l4.1-1.4L12 3Z" /><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" /><path d="m6 14 .6 1.6L8.2 16l-1.6.6L6 18.2l-.6-1.6L3.8 16l1.6-.4L6 14Z" /></RailSvg>;
}

function SettingsIcon() {
  return <RailSvg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1 .2l-.2.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1l-.1-.2a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1-.2l.2-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.4 1.6Z" /></RailSvg>;
}

function BaseCrmIcon() {
  return <RailSvg><path d="M5 6h14" /><path d="M5 12h14" /><path d="M5 18h14" /><circle cx="3.5" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="18" r="1.1" fill="currentColor" stroke="none" /></RailSvg>;
}

function SettingsPanel({
  accountName,
  currentPath,
  groups,
  onNavigate,
}: {
  accountName: string;
  currentPath: string;
  groups: { id: string; label: string; items: { id: string; label: string; path: string; badge?: string }[] }[];
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="icon-rail-settings-panel" data-testid="icon-rail-settings-panel">
      <div className="settings-details-card">
        <div className="settings-card-avatar">{getAvatarLetters(accountName)}</div>
        <div className="settings-card-meta">
          <div className="settings-card-name">{accountName}</div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="settings-group">
          <div className="settings-group-title">{group.label}</div>
          <div className="settings-group-items">
            {group.items.map((item) => {
              const active = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-item ${active ? "settings-item-active" : ""}`}
                  onClick={() => onNavigate(item.path)}
                >
                  <span className="settings-item-icon">{getSettingsItemIcon(item.id)}</span>
                  <span className="settings-item-label">{item.label}</span>
                  {item.badge && <span className="settings-item-badge">{item.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function getAvatarLetters(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getSettingsItemIcon(id: string) {
  const icons: Record<string, ReactNode> = {
    "settings-company": <BuildingIcon />,
    "settings-branding": <PaletteIcon />,
    "settings-branches": <MapPinIcon />,
    "settings-subscription": <BoxIcon />,
    "settings-billing": <ReceiptIcon />,
    "settings-communications": <MessageIcon />,
    "settings-team": <UsersIcon />,
    "settings-integrations": <PlugIcon />,
    "settings-data": <ShieldIcon />,
    "settings-developer": <CodeIcon />,
  };

  return icons[id] ?? <DotIcon />;
}

function BuildingIcon() {
  return <RailSvg><rect x="5" y="7" width="14" height="12" rx="2" /><path d="M10 7v-2h4v2" /><path d="M8 12h2" /><path d="M14 12h2" /></RailSvg>;
}

function PaletteIcon() {
  return <RailSvg><path d="M7 9.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Zm8.5-2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-7.5 7.5h8a2 2 0 0 1 2 2 2 2 0 0 1-2 2H9a5 5 0 1 1 0-10h4" /></RailSvg>;
}

function MapPinIcon() {
  return <RailSvg><path d="M12 21s7-4.1 7-10.5S14.9 3 12 3 5 6.4 5 10.5 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.5" /></RailSvg>;
}

function BoxIcon() {
  return <RailSvg><path d="M4 8.5 12 4l8 4.5v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" /><path d="M12 4v17" /><path d="M4 8.5l8 4.5 8-4.5" /></RailSvg>;
}

function ReceiptIcon() {
  return <RailSvg><path d="M6 4h12v16l-3-2-3 2-3-2-3 2V4Z" /><path d="M9 8h6" /><path d="M9 12h6" /></RailSvg>;
}

function MessageIcon() {
  return <RailSvg><rect x="4" y="5" width="16" height="12" rx="2" /><path d="M4 7l8 6 8-6" /></RailSvg>;
}

function PlugIcon() {
  return <RailSvg><path d="M9 3v6" /><path d="M15 3v6" /><path d="M7 9h10v6a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V9Z" /></RailSvg>;
}

function ShieldIcon() {
  return <RailSvg><path d="M12 3 5 6v5a7 7 0 0 0 4 6.3l3 1.5 3-1.5A7 7 0 0 0 19 11V6l-7-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></RailSvg>;
}

function CodeIcon() {
  return <RailSvg><path d="M9 8 5 12l4 4" /><path d="M15 8l4 4-4 4" /><path d="M12 4v16" /></RailSvg>;
}

function DotIcon() {
  return <RailSvg><circle cx="12" cy="12" r="3" fill="currentColor" /></RailSvg>;
}
