import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Select } from "@jaldee/design-system";
import { ChevronDown } from "lucide-react";
import { useShellStore } from "../store/shellStore";
import { BASE_CRM_SIDEBAR_SECTIONS, PRODUCT_SIDEBAR_BEHAVIOR, SIDEBAR_CONFIG } from "./sidebarConfig";
import type { SidebarSection } from "./sidebarConfig";
import type { ProductKey } from "../store/shellStore";

interface SidebarProps {
  collapseOnSelect: boolean;
  onSubmenuSelection: () => void;
}

export default function Sidebar({ collapseOnSelect, onSubmenuSelection }: SidebarProps) {
  const account = useShellStore((s) => s.account);
  const activeProduct = useShellStore((s) => s.activeProduct);
  const setSidebarVisible = useShellStore((s) => s.setSidebarVisible);
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isBaseCrm = !activeProduct;

  const sections: SidebarSection[] = activeProduct
    ? SIDEBAR_CONFIG[activeProduct] ?? []
    : filterBaseCrmSections(BASE_CRM_SIDEBAR_SECTIONS, account?.enabledModules);
  const submenuTitle = account?.name ?? "Jaldee Business";
  const showLocationSwitcher = !isBaseCrm && (activeProduct ? PRODUCT_SIDEBAR_BEHAVIOR[activeProduct]?.showLocationSwitcher ?? true : true);

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(path: string) {
    return location.pathname === path || (path !== `/${activeProduct}` && location.pathname.startsWith(path));
  }

  function handleNavigate(path: string) {
    navigate(path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    if (window.innerWidth <= 1024 || collapseOnSelect) {
      setSidebarVisible(false);
    }
    onSubmenuSelection();
  }

  return (
    <div
      data-testid="sidebar"
      data-product={activeProduct ?? "default"}
      data-kind={isBaseCrm ? "base-crm" : "product"}
      className="sidebar"
    >
      <SubmenuHeader title={submenuTitle} />
      {showLocationSwitcher ? <LocationSwitcher /> : null}

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

function filterBaseCrmSections(sections: SidebarSection[], enabledModules: string[] | undefined): SidebarSection[] {
  const modules = new Set(enabledModules ?? []);

  return sections.filter((section) => {
    if (section.id === "basecrm-tasks") {
      return modules.has("tasks");
    }
    if (section.id === "basecrm-membership") {
      return modules.has("membership");
    }
    if (section.id === "basecrm-leads" || section.id === "basecrm-audit-log") {
      return modules.has("leads");
    }
    return true;
  });
}

function SubmenuHeader({ title }: { title: string }) {
  return (
    <div className="settings-details-card sidebar-details-card">
      <div className="settings-card-avatar">{getHeaderLetters(title)}</div>
      <div className="settings-card-meta">
        <div className="settings-card-name">{title}</div>
      </div>
    </div>
  );
}

function getHeaderLetters(value: string) {
  return value
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const isOpen = expanded[section.id] ?? (hasChildren && isActive(section.path));
  const active = !hasChildren && isActive(section.path);

  function normalizePathForMatching(path: string): string {
    let normalized = path;
    if (normalized === "/membership/service") {
      normalized = "/membership/services";
    } else if (normalized.startsWith("/membership/service/")) {
      normalized = "/membership/services" + normalized.slice("/membership/service".length);
    }
    if (normalized === "/membership/paymentInfo") {
      normalized = "/membership/fee-management";
    } else if (normalized.startsWith("/membership/paymentInfo/")) {
      normalized = "/membership/fee-management" + normalized.slice("/membership/paymentInfo".length);
    }
    return normalized;
  }

  function isChildActive(childPath: string) {
    const normCurrent = normalizePathForMatching(currentPath);
    const normChild = normalizePathForMatching(childPath);

    if (normCurrent === normChild) {
      return true;
    }

    if (normChild === normalizePathForMatching(section.path)) {
      return false;
    }

    return normCurrent.startsWith(`${normChild}/`);
  }

  return (
    <div data-testid={`sidebar-section-${section.id}`}>
      <button
        type="button"
        data-testid={`sidebar-item-${section.id}`}
        data-product={product}
        data-active={active}
        data-open={isOpen}
        className="sidebar-item"
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-current={active ? "page" : undefined}
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
            <ChevronDown size={15} strokeWidth={2.25} aria-hidden="true" />
          </span>
        )}
      </button>

      {hasChildren && isOpen && (
        <div data-testid={`sidebar-children-${section.id}`} className="sidebar-children">
          {section.children!.map((child) => {
            const childActive = isChildActive(child.path);

            return (
              <button
                type="button"
                key={child.id}
                data-testid={`sidebar-item-${child.id}`}
                data-product={product}
                data-active={childActive}
                className="sidebar-child"
                aria-current={childActive ? "page" : undefined}
                onClick={() => onNavigate(child.path)}
              >
                <span className="sidebar-child-dot" data-active={childActive} />
                <span className="sidebar-child-label" data-active={childActive}>
                  {child.label}
                </span>
              </button>
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
      <Select
        id="sidebar-location-select"
        testId="sidebar-location-select"
        value={activeLocation?.id ?? ""}
        onChange={(e) => {
          const location = availableLocations.find((item) => item.id === e.target.value);
          if (location) {
            setLocation(location);
          }
        }}
        placeholder={availableLocations.length ? "Select location" : "No locations available"}
        options={availableLocations.map((location) => ({
          value: location.id,
          label: location.name,
        }))}
        disabled={!availableLocations.length}
        fullWidth
        containerClassName="sidebar-location-select-field"
        className="sidebar-location-select"
      />
    </div>
  );
}
