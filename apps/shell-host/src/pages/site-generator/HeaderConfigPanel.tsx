import React, { useState } from "react";
import { Select, Input } from "@jaldee/design-system";
import { SiteConfig } from "./siteGeneratorTypes";

export interface HeaderConfigPanelProps {
  config: SiteConfig;
  menuItems: { title: string; link: string }[];
  loggedInMenuItems: { title: string; link: string }[];
  announcements: string[];
  onChangeConfig: React.Dispatch<React.SetStateAction<SiteConfig>>;
  onOpenHeaderColorsModal?: () => void;
  onOpenHeaderExtrasModal?: () => void;
  onAddMenuItem: () => void;
  onEditMenuItem: (idx: number) => void;
  onDeleteMenuItem: (idx: number) => void;
  onAddLoggedInMenuItem: () => void;
  onEditLoggedInMenuItem: (idx: number) => void;
  onDeleteLoggedInMenuItem: (idx: number) => void;
  onAddAnnouncement: () => void;
  onEditAnnouncement: (idx: number) => void;
  onDeleteAnnouncement: (idx: number) => void;
  onOpenResponsiveModal?: () => void;
}

export function HeaderConfigPanel({
  config,
  menuItems,
  loggedInMenuItems,
  announcements,
  onChangeConfig,
  onOpenHeaderColorsModal,
  onOpenHeaderExtrasModal,
  onAddMenuItem,
  onEditMenuItem,
  onDeleteMenuItem,
  onAddLoggedInMenuItem,
  onEditLoggedInMenuItem,
  onDeleteLoggedInMenuItem,
  onAddAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onOpenResponsiveModal,
}: HeaderConfigPanelProps) {
  const [openAccordion, setOpenAccordion] = useState<"layout" | "menu" | "account" | "announcements" | null>("layout");

  const toggleAccordion = (name: "layout" | "menu" | "account" | "announcements") => {
    setOpenAccordion((prev) => (prev === name ? null : name));
  };

  return (
    <div className="sg-header-config-wrapper" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Change Header Layout */}
      <div className="sg-config-group-card" style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#ffffff" }}>
        <div
          className="sg-config-group-item"
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}
          onClick={() => toggleAccordion("layout")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="sg-config-group-icon">📖</div>
            <div className="sg-config-group-info">
              <h6 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Header Layout & Title</h6>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Switch layout variants and brand title</p>
            </div>
          </div>
          <span style={{ fontSize: 14, color: "#64748b" }}>{openAccordion === "layout" ? "▲" : "▼"}</span>
        </div>

        {openAccordion === "layout" && (
          <div style={{ padding: "0 16px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
            <div className="settings-form-grid settings-form-grid--two" style={{ marginTop: 12 }}>
              <Select
                label="Header Style Variant"
                value={config.header?.name || "fashion"}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, header: { ...prev.header, name: e.target.value } }))
                }
                options={[
                  { value: "fashion", label: "Fashion Full Header" },
                  { value: "fashion-inline", label: "Fashion Inline Header" },
                  { value: "header1", label: "Header Variant 1" },
                  { value: "minimal", label: "Minimalist Header" },
                ]}
              />
              <Input
                label="Header Title"
                value={config.header?.title || ""}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, header: { ...prev.header, title: e.target.value } }))
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Choose Colors */}
      <div className="sg-config-group-card" style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#ffffff", padding: "14px 16px", cursor: "pointer" }} onClick={onOpenHeaderColorsModal}>
        <div className="sg-config-group-item" style={{ padding: 0 }}>
          <div className="sg-config-group-icon">🖌️</div>
          <div className="sg-config-group-info">
            <h6 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Choose Colors</h6>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Update background, text, and ticker colors</p>
          </div>
        </div>
      </div>

      {/* Extras & Features */}
      <div className="sg-config-group-card" style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#ffffff", padding: "14px 16px", cursor: "pointer" }} onClick={onOpenHeaderExtrasModal}>
        <div className="sg-config-group-item" style={{ padding: 0 }}>
          <div className="sg-config-group-icon">⚙️</div>
          <div className="sg-config-group-info">
            <h6 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Extras & Features</h6>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Configure Cart, Search, Wishlist, and Account labels & icons</p>
          </div>
        </div>
      </div>

      {/* MENU ITEMS SECTION */}
      <div className="sg-header-section-block" style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#ffffff" }}>
        <div
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}
          onClick={() => toggleAccordion("menu")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>☰</span>
            <h6 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155" }}>
              Menu Items <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "none" }}>({menuItems.length})</span>
            </h6>
          </div>
          <span style={{ fontSize: 14, color: "#64748b" }}>{openAccordion === "menu" ? "▲" : "▼"}</span>
        </div>

        {openAccordion === "menu" && (
          <div style={{ padding: "0 16px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
            <div className="sg-item-list" style={{ marginTop: 12 }}>
              {menuItems.map((item, idx) => (
                <div key={`${item.link}-${idx}`} className="sg-item-row">
                  <span className="sg-item-row-title">{item.title}</span>
                  <div className="sg-item-row-actions">
                    <button
                      type="button"
                      className="sg-icon-action-btn"
                      onClick={() => onEditMenuItem(idx)}
                      title="Edit link"
                    >
                      📝
                    </button>
                    <button
                      type="button"
                      className="sg-icon-action-btn sg-icon-action-btn--delete"
                      onClick={() => onDeleteMenuItem(idx)}
                      title="Delete link"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              <div className="sg-add-item-card" onClick={onAddMenuItem}>
                <span className="sg-add-item-icon">☰</span>
                <div className="sg-add-item-info">
                  <h6>Add Menu Item</h6>
                  <p>Insert a navigation link.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LOGGED-IN MENU ITEMS SECTION */}
      <div className="sg-header-section-block" style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#ffffff" }}>
        <div
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}
          onClick={() => toggleAccordion("account")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <h6 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155" }}>
              Logged-in Menu Items <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "none" }}>({loggedInMenuItems.length})</span>
            </h6>
          </div>
          <span style={{ fontSize: 14, color: "#64748b" }}>{openAccordion === "account" ? "▲" : "▼"}</span>
        </div>

        {openAccordion === "account" && (
          <div style={{ padding: "0 16px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
            <div className="sg-item-list" style={{ marginTop: 12 }}>
              {loggedInMenuItems.map((item, idx) => (
                <div key={`${item.link}-${idx}`} className="sg-item-row">
                  <span className="sg-item-row-title">{item.title}</span>
                  <div className="sg-item-row-actions">
                    <button
                      type="button"
                      className="sg-icon-action-btn"
                      onClick={() => onEditLoggedInMenuItem(idx)}
                      title="Edit item"
                    >
                      📝
                    </button>
                    <button
                      type="button"
                      className="sg-icon-action-btn sg-icon-action-btn--delete"
                      onClick={() => onDeleteLoggedInMenuItem(idx)}
                      title="Delete item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              <div className="sg-add-item-card" onClick={onAddLoggedInMenuItem}>
                <span className="sg-add-item-icon">👤</span>
                <div className="sg-add-item-info">
                  <h6>Add Logged-in Menu Item</h6>
                  <p>Add account menu links after login.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ANNOUNCEMENT SECTION */}
      <div className="sg-header-section-block" style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#ffffff" }}>
        <div
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}
          onClick={() => toggleAccordion("announcements")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>📢</span>
            <h6 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155" }}>
              Announcements <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "none" }}>({announcements.length})</span>
            </h6>
          </div>
          <span style={{ fontSize: 14, color: "#64748b" }}>{openAccordion === "announcements" ? "▲" : "▼"}</span>
        </div>

        {openAccordion === "announcements" && (
          <div style={{ padding: "0 16px 16px 16px", borderTop: "1px solid #f1f5f9" }}>
            <div className="sg-item-list" style={{ marginTop: 12 }}>
              {announcements.map((text, idx) => (
                <div key={`ann-${idx}`} className="sg-item-row">
                  <span
                    className="sg-item-row-title"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                  <div className="sg-item-row-actions">
                    <button
                      type="button"
                      className="sg-icon-action-btn"
                      onClick={() => onEditAnnouncement(idx)}
                      title="Edit announcement"
                    >
                      📝
                    </button>
                    <button
                      type="button"
                      className="sg-icon-action-btn sg-icon-action-btn--delete"
                      onClick={() => onDeleteAnnouncement(idx)}
                      title="Delete announcement"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              <div className="sg-add-item-card" onClick={onAddAnnouncement}>
                <span className="sg-add-item-icon">📢</span>
                <div className="sg-add-item-info">
                  <h6>Add Announcement</h6>
                  <p>Insert a top notification message.</p>
                </div>
              </div>

              {/* Responsiveness card inline */}
              <div className="sg-add-item-card" onClick={onOpenResponsiveModal} style={{ marginTop: 8 }}>
                <span className="sg-add-item-icon">📱</span>
                <div className="sg-add-item-info">
                  <h6>Responsiveness</h6>
                  <p>Mobile and tablet settings</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
