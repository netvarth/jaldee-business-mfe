import React, { useState } from "react";
import { Button, Input, Switch } from "@jaldee/design-system";

export interface HeaderToolConfig {
  enabled: boolean;
  displayName: string;
  icon: string;
  iconImage: string;
  hideOnSmallView: boolean;
}

export interface HeaderExtrasState {
  cart: HeaderToolConfig;
  help: HeaderToolConfig;
  search: HeaderToolConfig;
  wishlist: HeaderToolConfig;
  login: HeaderToolConfig;
  mobileNavigation: HeaderToolConfig;
}

export interface HeaderExtrasModalProps {
  isOpen: boolean;
  state: HeaderExtrasState;
  onChangeState: React.Dispatch<React.SetStateAction<HeaderExtrasState>>;
  onClose: () => void;
}

export const DEFAULT_HEADER_EXTRAS: HeaderExtrasState = {
  cart: {
    enabled: true,
    displayName: "Cart",
    icon: "fa-shopping-cart",
    iconImage: "https://example.com/icon.png",
    hideOnSmallView: false,
  },
  help: {
    enabled: false,
    displayName: "Help",
    icon: "fa-question-circle",
    iconImage: "",
    hideOnSmallView: false,
  },
  search: {
    enabled: true,
    displayName: "Search",
    icon: "fa-search",
    iconImage: "https://example.com/icon.png",
    hideOnSmallView: false,
  },
  wishlist: {
    enabled: false,
    displayName: "Wishlist",
    icon: "fa-heart",
    iconImage: "",
    hideOnSmallView: false,
  },
  login: {
    enabled: true,
    displayName: "Account",
    icon: "fa-user",
    iconImage: "https://example.com/icon.png",
    hideOnSmallView: false,
  },
  mobileNavigation: {
    enabled: false,
    displayName: "Mobile Navigation",
    icon: "fa-bars",
    iconImage: "",
    hideOnSmallView: false,
  },
};

const POPULAR_ICON_PRESETS = [
  { label: "🛒 Cart", icon: "fa-shopping-cart" },
  { label: "🛍️ Bag", icon: "fa-shopping-bag" },
  { label: "🔍 Search", icon: "fa-search" },
  { label: "👤 User", icon: "fa-user" },
  { label: "❤️ Heart", icon: "fa-heart" },
  { label: "❓ Help", icon: "fa-question-circle" },
  { label: "🎁 Gift", icon: "fa-gift" },
  { label: "📞 Phone", icon: "fa-phone" },
  { label: "🔔 Bell", icon: "fa-bell" },
];

const TOOL_TABS: { key: keyof HeaderExtrasState; label: string; icon: string }[] = [
  { key: "cart", label: "Cart", icon: "🛒" },
  { key: "search", label: "Search", icon: "🔍" },
  { key: "login", label: "Login", icon: "👤" },
  { key: "wishlist", label: "Wishlist", icon: "❤️" },
  { key: "help", label: "Help", icon: "❓" },
  { key: "mobileNavigation", label: "Mobile Nav", icon: "📱" },
];

export function HeaderExtrasModal({
  isOpen,
  state,
  onChangeState,
  onClose,
}: HeaderExtrasModalProps) {
  const [activeTab, setActiveTab] = useState<keyof HeaderExtrasState>("cart");

  if (!isOpen) return null;

  const updateTool = (key: keyof HeaderExtrasState, updates: Partial<HeaderToolConfig>) => {
    onChangeState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...updates,
      },
    }));
  };

  const currentTool = state[activeTab];
  const currentTabInfo = TOOL_TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="sg-modal-overlay">
      <div className="sg-modal-backdrop" onClick={onClose} />
      <div className="sg-modal-content" style={{ maxWidth: 620, padding: 24, borderRadius: 16 }}>
        {/* Header Title */}
        <div style={{ marginBottom: 16 }}>
          <h5 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Header Tool Labels & Icons
          </h5>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            Select a header tool below to configure its label, icon, and display settings.
          </p>
        </div>

        {/* Horizontal Tab Strip */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
          {TOOL_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            const isEnabled = state[tab.key].enabled;
            return (
              <button
                key={tab.key}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: isSelected ? "#eff6ff" : "#ffffff",
                  color: isSelected ? "#1d4ed8" : "#334155",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: isEnabled ? "#22c55e" : "#cbd5e1",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Selected Tool Configuration Card */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 20,
            backgroundColor: "#f8fafc",
            marginBottom: 20,
          }}
        >
          {/* Enable Toggle Header */}
          <div
            style={{
              display: "flex",
              justify: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: currentTool.enabled ? 16 : 0,
              paddingBottom: currentTool.enabled ? 12 : 0,
              borderBottom: currentTool.enabled ? "1px solid #e2e8f0" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{currentTabInfo.icon}</span>
              <h6 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentTabInfo.label} Tool Settings
              </h6>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 12,
                  backgroundColor: currentTool.enabled ? "#dcfce7" : "#f1f5f9",
                  color: currentTool.enabled ? "#15803d" : "#64748b",
                }}
              >
                {currentTool.enabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={currentTool.enabled}
                onChange={(checked) => updateTool(activeTab, { enabled: checked })}
              />
            </div>
          </div>

          {currentTool.enabled ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="settings-form-grid settings-form-grid--two">
                <Input
                  label="Display Name"
                  value={currentTool.displayName}
                  onChange={(e) => updateTool(activeTab, { displayName: e.target.value })}
                />
                <Input
                  label="Icon Class"
                  value={currentTool.icon}
                  onChange={(e) => updateTool(activeTab, { icon: e.target.value })}
                />
              </div>

              {/* Quick Icon Selector Pills */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 8 }}>
                  Quick Preset Icons:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {POPULAR_ICON_PRESETS.map((p) => (
                    <button
                      key={p.icon}
                      type="button"
                      style={{
                        border: currentTool.icon === p.icon ? "1px solid #2563eb" : "1px solid #cbd5e1",
                        background: currentTool.icon === p.icon ? "#ffffff" : "#ffffff",
                        color: currentTool.icon === p.icon ? "#1d4ed8" : "#475569",
                        boxShadow: currentTool.icon === p.icon ? "0 1px 3px rgba(37,99,235,0.2)" : "none",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                      onClick={() => updateTool(activeTab, { icon: p.icon })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Icon Image (Optional URL)"
                value={currentTool.iconImage}
                onChange={(e) => updateTool(activeTab, { iconImage: e.target.value })}
                placeholder="https://example.com/icon.png"
                fullWidth
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <Switch
                  checked={currentTool.hideOnSmallView}
                  onChange={(checked) => updateTool(activeTab, { hideOnSmallView: checked })}
                />
                <span style={{ fontSize: 13, color: "#475569" }}>Hide on small view (Mobile)</span>
              </div>
            </div>
          ) : (
            <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
              This tool is currently disabled in the website header. Flip the switch above to enable it.
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}


