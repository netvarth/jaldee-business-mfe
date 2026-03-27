import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import { SIDEBAR_CONFIG } from "./sidebarConfig";
import type { SidebarSection } from "./sidebarConfig";
import type { ProductKey } from "../store/shellStore";

export default function Sidebar() {
  const activeProduct = useShellStore((s) => s.activeProduct);
  const sidebarVisible = useShellStore((s) => s.sidebarVisible);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const location = useLocation();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!activeProduct) return null;

  const sections = SIDEBAR_CONFIG[activeProduct];
  if (!sections) return null;

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(path: string) {
    return location.pathname === path
      || (path !== `/${activeProduct}` && location.pathname.startsWith(path));
  }

  return (
    <div className="sidebar-frame">
      {sidebarVisible && (
        <div data-testid="sidebar" data-product={activeProduct} className="sidebar">
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
                onNavigate={navigate}
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
  const isOpen = expanded[section.id];
  const active = isActive(section.path);

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
            const childActive = isActive(child.path);

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
