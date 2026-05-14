// Custom hook to detect small screens (up to 1024px)
import { useEffect } from "react";

function useIsSmallScreen() {
  const [isSmall, setIsSmall] = useState(() => window.innerWidth <= 1024);
  useEffect(() => {
    function handleResize() {
      setIsSmall(window.innerWidth <= 1024);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isSmall;
}
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import { BASE_CRM_SIDEBAR_SECTIONS, SIDEBAR_CONFIG } from "./sidebarConfig";
import type { SidebarSection } from "./sidebarConfig";
import type { ProductKey } from "../store/shellStore";

const BASE_CRM_PATH_PREFIXES = [
  "/customers",
  "/users",
  "/reports",
  "/drive",
  "/tasks",
  "/membership",
  "/leads",
  "/audit-log",
  "/ivr",
];

export default function Sidebar() {
  const activeProduct = useShellStore((s) => s.activeProduct);
  const sidebarVisible = useShellStore((s) => s.sidebarVisible);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);
  const setSidebarVisible = useShellStore((s) => s.setSidebarVisible);
  const navigate = useNavigate();
  const location = useLocation();
  const isSmallScreen = useIsSmallScreen();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Collapse sidebar by default on small screens
  useEffect(() => {
    if (isSmallScreen && sidebarVisible) {
      setSidebarVisible(false);
    }
  }, [isSmallScreen]);

  const isBaseCrmRoute = BASE_CRM_PATH_PREFIXES.some((path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  const sections: SidebarSection[] | undefined = activeProduct
    ? SIDEBAR_CONFIG[activeProduct]
    : isBaseCrmRoute
      ? BASE_CRM_SIDEBAR_SECTIONS
      : undefined;

  if (!sections) return null;

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(path: string) {
    return location.pathname === path
      || (path !== `/${activeProduct}` && location.pathname.startsWith(path));
  }

  // Custom navigation that collapses sidebar on small screens
  function handleNavigate(path: string) {
    navigate(path);
    if (isSmallScreen) {
      setSidebarVisible(false);
    }
  }

  return (
    <div className="sidebar-frame">
      {sidebarVisible && (
        <div data-testid="sidebar" data-product={activeProduct ?? "default"} className="sidebar">
          <LocationSwitcher />

          <div className="sidebar-spacer">
            {sections.map((section) => (
              <SidebarItemRow
                key={section.id}
                product={activeProduct}
                section={section}
                isActive={isActive}
                expanded={expanded}
                onToggle={toggleExpand}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </div>
      )}

      <div
        data-testid="sidebar-toggle"
        className={`sidebar-toggle ${sidebarVisible ? "sidebar-toggle--open" : "sidebar-toggle--closed"}`}
        onClick={toggleSidebar}
        title={sidebarVisible ? "Collapse sidebar" : "Expand sidebar"}
      >
        <div className="sidebar-toggle-button">
          {sidebarVisible ? "‹" : "›"}
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  product: ProductKey;
  section: SidebarSection;
  isActive: (path: string) => boolean;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onNavigate: (path: string) => void;
}

function SidebarItemRow({
  product,
  section,
  isActive,
  expanded,
  onToggle,
  onNavigate,
}: RowProps) {
  const hasChildren = Boolean(section.children?.length);
  const isOpen = expanded[section.id] ?? isActive(section.path);
  const active = isActive(section.path);

  function isChildActive(childPath: string) {
    if (location.pathname === childPath) {
      return true;
    }

    if (childPath === section.path) {
      return false;
    }

    return location.pathname.startsWith(`${childPath}/`);
  }

  return (
    <div data-testid={`sidebar-section-${section.id}`}>
      <div
        data-testid={`sidebar-item-${section.id}`}
        data-product={product}
        data-active={active}
        className="sidebar-item"
        onClick={() => {
          if (hasChildren) {
            onToggle(section.id);
            return;
          }
          onNavigate(section.path);
        }}
      >
        <span className="sidebar-item-icon">{section.icon}</span>
        <span className="sidebar-item-label" data-active={active}>
          {section.label}
        </span>
        {hasChildren && (
          <span className="sidebar-item-chevron" data-open={isOpen}>
            ▾
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div data-testid={`sidebar-children-${section.id}`}>
          {section.children!.map((child) => {
            const childActive = isChildActive(child.path);

            return (
              <div
                key={child.id}
                data-testid={`sidebar-item-${child.id}`}
                data-product={product}
                data-active={childActive}
                className="sidebar-child"
                onClick={() => onNavigate(child.path)}
              >
                <span className="sidebar-child-dot" data-active={childActive} />
                <span className="sidebar-child-label" data-active={childActive}>
                  {child.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LocationSwitcher() {
  const activeLocation = useShellStore((s) => s.activeLocation);
  const availableLocations = useShellStore((s) => s.availableLocations);
  const setLocation = useShellStore((s) => s.setLocation);

  return (
    <div data-testid="sidebar-location-switcher" className="sidebar-location-switcher">
      <select
        data-testid="sidebar-location-select"
        value={activeLocation?.id ?? ""}
        onChange={(e) => {
          const location = availableLocations.find((item) => item.id === e.target.value);
          if (location) {
            setLocation(location);
          }
        }}
        className="sidebar-location-select"
      >
        {availableLocations.map((location) => (
          <option
            key={location.id}
            value={location.id}
            data-testid={`sidebar-location-option-${location.code.toLowerCase()}`}
          >
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
}
