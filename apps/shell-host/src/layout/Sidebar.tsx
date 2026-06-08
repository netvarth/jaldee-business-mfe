import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import { BASE_CRM_SIDEBAR_SECTIONS, SIDEBAR_CONFIG } from "./sidebarConfig";
import type { SidebarSection } from "./sidebarConfig";
import type { ProductKey } from "../store/shellStore";

export default function Sidebar() {
  const activeProduct = useShellStore((s) => s.activeProduct);
  const setSidebarVisible = useShellStore((s) => s.setSidebarVisible);
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isBaseCrm = !activeProduct;

  const sections: SidebarSection[] = activeProduct
    ? SIDEBAR_CONFIG[activeProduct] ?? []
    : BASE_CRM_SIDEBAR_SECTIONS;

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(path: string) {
    return location.pathname === path || (path !== `/${activeProduct}` && location.pathname.startsWith(path));
  }

  function handleNavigate(path: string) {
    navigate(path);
    if (window.innerWidth <= 1024) {
      setSidebarVisible(false);
    }
  }

  return (
    <div
      data-testid="sidebar"
      data-product={activeProduct ?? "default"}
      data-kind={isBaseCrm ? "base-crm" : "product"}
      className="sidebar"
    >
      {!isBaseCrm ? <LocationSwitcher /> : null}

      {isBaseCrm ? (
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
              currentPath={location.pathname}
            />
          ))}
        </div>
      ) : (
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
              currentPath={location.pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  product: ProductKey | null;
  section: SidebarSection;
  isActive: (path: string) => boolean;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}

function SidebarItemRow({
  product,
  section,
  isActive,
  expanded,
  onToggle,
  onNavigate,
  currentPath,
}: RowProps) {
  const hasChildren = Boolean(section.children?.length);
  const isOpen = expanded[section.id] ?? isActive(section.path);
  const active = isActive(section.path);

  function isChildActive(childPath: string) {
    if (currentPath === childPath) {
      return true;
    }

    if (childPath === section.path) {
      return false;
    }

    return currentPath.startsWith(`${childPath}/`);
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
            v
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div data-testid={`sidebar-children-${section.id}`} className="sidebar-children">
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
