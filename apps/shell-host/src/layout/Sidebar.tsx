import { useState }                        from "react";
import { useNavigate, useLocation }        from "react-router-dom";
import { useShellStore }                   from "../store/shellStore";
import { SIDEBAR_CONFIG, PRODUCT_ACCENTS } from "./sidebarConfig";
import type { SidebarSection }             from "./sidebarConfig";

export default function Sidebar() {
  const activeProduct  = useShellStore((s) => s.activeProduct);
  const sidebarVisible = useShellStore((s) => s.sidebarVisible);
  const toggleSidebar  = useShellStore((s) => s.toggleSidebar);
  const navigate       = useNavigate();
  const location       = useLocation();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!activeProduct) return null;

  const sections = SIDEBAR_CONFIG[activeProduct];
  if (!sections)  return null;

  const accent = PRODUCT_ACCENTS[activeProduct] ?? "#5B21D1";

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(path: string) {
    return location.pathname === path ||
      (path !== `/${activeProduct}` && location.pathname.startsWith(path));
  }

  return (
    <div style={{ display: "flex", flexShrink: 0, position: "relative" }}>

      {/* Sidebar panel */}
      {sidebarVisible && (
        <div
          data-testid="sidebar"
          data-product={activeProduct}
          style={{
            width:         "220px",
            height:        "100%",
            background:    "white",
            borderRight:   "1px solid #E5E7EB",
            overflowY:     "auto",
            flexShrink:    0,
            paddingBottom: "24px",
            display:       "flex",
            flexDirection: "column",
          }}
        >
          {/* Location switcher */}
          <LocationSwitcher />

          {/* Navigation items */}
          <div style={{ flex: 1 }}>
            {sections.map((section) => (
              <SidebarItemRow
                key={section.id}
                section={section}
                accent={accent}
                isActive={isActive}
                expanded={expanded}
                onToggle={toggleExpand}
                onNavigate={navigate}
              />
            ))}
          </div>

        </div>
      )}

      {/* Collapse toggle — fixed position, always visible */}
      <div
        data-testid="sidebar-toggle"
        onClick={toggleSidebar}
        title={sidebarVisible ? "Collapse sidebar" : "Expand sidebar"}
        style={{
          position:   "fixed",
          left:       sidebarVisible ? "280px" : "72px",
          top:        "68px",
          zIndex:     200,
          transition: "left 0.2s ease",
        }}
      >
        <div style={{
          width:          "20px",
          height:         "20px",
          background:     "white",
          border:         "1px solid #E5E7EB",
          borderRadius:   "50%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          cursor:         "pointer",
          fontSize:       "10px",
          color:          "#6B7280",
          boxShadow:      "0 1px 4px rgba(0,0,0,0.10)",
          userSelect:     "none",
        }}>
          {sidebarVisible ? "‹" : "›"}
        </div>
      </div>

    </div>
  );
}

// ─── Sidebar Item Row ─────────────────────────────────

interface RowProps {
  section:    SidebarSection;
  accent:     string;
  isActive:   (path: string) => boolean;
  expanded:   Record<string, boolean>;
  onToggle:   (id: string) => void;
  onNavigate: (path: string) => void;
}

function SidebarItemRow({
  section, accent, isActive, expanded, onToggle, onNavigate
}: RowProps) {
  const hasChildren = section.children && section.children.length > 0;
  const isOpen      = expanded[section.id];
  const active      = isActive(section.path);

  return (
    <div data-testid={`sidebar-section-${section.id}`}>

      {/* Main row */}
      <div
        data-testid={`sidebar-item-${section.id}`}
        data-active={active}
        onClick={() => {
          if (hasChildren) {
            onToggle(section.id);
          } else {
            onNavigate(section.path);
          }
        }}
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "8px",
          padding:    "8px 16px",
          cursor:     "pointer",
          background: active ? `${accent}12` : "transparent",
          borderLeft: active ? `3px solid ${accent}` : "3px solid transparent",
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: "15px", width: "18px", textAlign: "center" }}>
          {section.icon}
        </span>
        <span style={{
          flex:       1,
          fontSize:   "13px",
          fontWeight: active ? 600 : 400,
          color:      active ? accent : "#374151",
        }}>
          {section.label}
        </span>
        {hasChildren && (
          <span style={{
            fontSize:   "10px",
            color:      "#9CA3AF",
            transition: "transform 0.15s",
            transform:  isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}>
            ▾
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <div data-testid={`sidebar-children-${section.id}`}>
          {section.children!.map((child) => {
            const childActive = isActive(child.path);
            return (
              <div
                key={child.id}
                data-testid={`sidebar-item-${child.id}`}
                data-active={childActive}
                onClick={() => onNavigate(child.path)}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        "8px",
                  padding:    "6px 16px 6px 40px",
                  cursor:     "pointer",
                  background: childActive ? `${accent}12` : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <span style={{
                  width:        "6px",
                  height:       "6px",
                  borderRadius: "50%",
                  background:   childActive ? accent : "#D1D5DB",
                  flexShrink:   0,
                }} />
                <span style={{
                  fontSize:   "12px",
                  fontWeight: childActive ? 600 : 400,
                  color:      childActive ? accent : "#6B7280",
                }}>
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

// ─── Location Switcher ────────────────────────────────

function LocationSwitcher() {
  const activeLocation     = useShellStore((s) => s.activeLocation);
  const availableLocations = useShellStore((s) => s.availableLocations);
  const setLocation        = useShellStore((s) => s.setLocation);

  return (
    <div
      data-testid="sidebar-location-switcher"
      style={{
        padding:      "12px 16px",
        borderBottom: "1px solid #E5E7EB",
        flexShrink:   0,
      }}
    >
      <select
        data-testid="sidebar-location-select"
        value={activeLocation?.id ?? ""}
        onChange={(e) => {
          const loc = availableLocations.find(l => l.id === e.target.value);
          if (loc) setLocation(loc);
        }}
        style={{
          width:        "100%",
          padding:      "7px 10px",
          border:       "1px solid #E5E7EB",
          borderRadius: "8px",
          fontSize:     "13px",
          color:        "#374151",
          background:   "white",
          cursor:       "pointer",
          outline:      "none",
          fontWeight:   500,
        }}
      >
        {availableLocations.map(loc => (
          <option
            key={loc.id}
            value={loc.id}
            data-testid={`sidebar-location-option-${loc.code.toLowerCase()}`}
          >
            {loc.name}
          </option>
        ))}
      </select>
    </div>
  );
}