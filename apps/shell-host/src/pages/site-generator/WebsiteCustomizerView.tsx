import React, { useState } from "react";
import {
  Button,
  Input,
  Select,
  Textarea,
  ServiceCard,
  BannerCard,
  TestimonialCard,
  BlogCard,
  SiteHeader,
} from "@jaldee/design-system";
import {
  SiteConfig,
  SECTION_LAYOUT_TYPES,
  ASPECT_RATIO_PRESETS,
  FooterState,
} from "./siteGeneratorTypes";
import { HeaderConfigPanel } from "./HeaderConfigPanel";
import { FooterConfigPanel } from "./FooterConfigPanel";
import { FooterModals } from "./FooterModals";
import { ColorChooserModal } from "./ColorChooserModal";
import { AddEditItemModal } from "./AddEditItemModal";
import { HeaderExtrasModal, HeaderExtrasState } from "./HeaderExtrasModal";
import { MenuItemModal, MenuItemData } from "./MenuItemModal";
import { LoggedInMenuItemModal, LoggedInMenuItemData } from "./LoggedInMenuItemModal";
import { AnnouncementModal, AnnouncementData } from "./AnnouncementModal";
import { AnnouncementResponsiveModal, AnnouncementResponsiveData } from "./AnnouncementResponsiveModal";
import { FooterMenuItemModal, FooterMenuItemData } from "./FooterMenuItemModal";
import { FooterSocialModal, FooterSocialData } from "./FooterSocialModal";

export interface WebsiteCustomizerViewProps {
  config: SiteConfig;
  menuItems: { title: string; link: string }[];
  loggedInMenuItems: { title: string; link: string }[];
  announcements: string[];
  headerExtrasState: HeaderExtrasState;
  footerState: FooterState;
  footerMenuItems: string[];
  footerSocialMedia: FooterSocialData[];
  footerColumns: string[];
  openSectionIdx: number | null;
  isDetachedOpen: boolean;
  onChangeConfig: React.Dispatch<React.SetStateAction<SiteConfig>>;
  onChangeHeaderExtrasState: React.Dispatch<React.SetStateAction<HeaderExtrasState>>;
  onChangeFooterState: React.Dispatch<React.SetStateAction<FooterState>>;
  onOpenDetachedPreview: () => void;
  onSaveConfiguration: () => void;
  onExportJSON?: () => void;
  onBackToHome: () => void;
  onAddSection: () => void;
  onRemoveSection: (idx: number, e: React.MouseEvent) => void;
  onToggleSectionIdx: (idx: number) => void;
  // Header Handlers
  setMenuItems: React.Dispatch<React.SetStateAction<{ title: string; link: string }[]>>;
  setLoggedInMenuItems: React.Dispatch<React.SetStateAction<{ title: string; link: string }[]>>;
  setAnnouncements: React.Dispatch<React.SetStateAction<string[]>>;
  // Footer Handlers
  setFooterMenuItems: React.Dispatch<React.SetStateAction<string[]>>;
  setFooterSocialMedia: React.Dispatch<React.SetStateAction<FooterSocialData[]>>;
  setFooterColumns: React.Dispatch<React.SetStateAction<string[]>>;
}

export function WebsiteCustomizerView({
  config,
  menuItems,
  loggedInMenuItems,
  announcements,
  headerExtrasState,
  footerState,
  footerMenuItems,
  footerSocialMedia,
  footerColumns,
  openSectionIdx,
  isDetachedOpen,
  onChangeConfig,
  onChangeHeaderExtrasState,
  onChangeFooterState,
  onOpenDetachedPreview,
  onSaveConfiguration,
  onExportJSON,
  onBackToHome,
  onAddSection,
  onRemoveSection,
  onToggleSectionIdx,
  setMenuItems,
  setLoggedInMenuItems,
  setAnnouncements,
  setFooterMenuItems,
  setFooterSocialMedia,
  setFooterColumns,
}: WebsiteCustomizerViewProps) {
  const [websitePanel, setWebsitePanel] = useState<"template" | "header" | "sections" | "footer" | "extras">("template");
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [deviceFrame, setDeviceFrame] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showFooterLayoutModal, setShowFooterLayoutModal] = useState(false);
  const [showFooterColorsModal, setShowFooterColorsModal] = useState(false);
  const [showHeaderColorsModal, setShowHeaderColorsModal] = useState(false);
  const [showHeaderExtrasModal, setShowHeaderExtrasModal] = useState(false);
  const [footerSocialModalState, setFooterSocialModalState] = useState<{
    isOpen: boolean;
    editingIndex: number | null;
    initialData?: Partial<FooterSocialData>;
  }>({ isOpen: false, editingIndex: null });
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    inputLabel?: string;
    initialValue?: string;
    placeholder?: string;
    onSubmit: (val: string) => void;
  }>({
    isOpen: false,
    title: "",
    onSubmit: () => {},
  });
  const [menuItemModalState, setMenuItemModalState] = useState<{
    isOpen: boolean;
    title?: string;
    initialData?: Partial<MenuItemData>;
    onSubmit: (data: MenuItemData) => void;
  }>({
    isOpen: false,
    onSubmit: () => {},
  });
  const [loggedInMenuItemModalState, setLoggedInMenuItemModalState] = useState<{
    isOpen: boolean;
    title?: string;
    initialData?: Partial<LoggedInMenuItemData>;
    onSubmit: (data: LoggedInMenuItemData) => void;
  }>({
    isOpen: false,
    onSubmit: () => {},
  });
  const [announcementModalState, setAnnouncementModalState] = useState<{
    isOpen: boolean;
    title?: string;
    initialData?: Partial<AnnouncementData>;
    onSubmit: (data: AnnouncementData) => void;
  }>({
    isOpen: false,
    onSubmit: () => {},
  });
  const [announcementResponsiveOpen, setAnnouncementResponsiveOpen] = useState(false);
  const [announcementResponsiveData, setAnnouncementResponsiveData] = useState<AnnouncementResponsiveData | undefined>(undefined);
  const [footerMenuItemModalState, setFooterMenuItemModalState] = useState<{
    isOpen: boolean;
    title?: string;
    initialData?: Partial<FooterMenuItemData>;
    onSubmit: (data: FooterMenuItemData) => void;
  }>({ isOpen: false, onSubmit: () => {} });

  return (
    <div className="sg-wrapper">
      <div className="sg-header-card">
        <div className="sg-header-title-row">
          <h5>
            <span className="sg-back-arrow" onClick={onBackToHome} title="Back to Home">
              ←
            </span>
            &nbsp;&nbsp;Website Config Generator ({config.seo?.title || config.template})
            <p className="sg-header-subtitle">Configure your website template, fonts, headers, and S3 content</p>
          </h5>
          <div className="sg-header-actions">
            {onExportJSON && (
              <Button variant="secondary" size="sm" onClick={onExportJSON}>
                📥 Export JSON
              </Button>
            )}
            <Button
              variant={isDetachedOpen ? "primary" : "secondary"}
              size="sm"
              onClick={onOpenDetachedPreview}
            >
              ↗️ {isDetachedOpen ? "Focus Detached Window" : "Detached Live Show"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowLivePreview(!showLivePreview)}>
              👁️ {showLivePreview ? "Hide Docked Preview" : "Docked Preview"}
            </Button>
            <Button variant="primary" size="sm" onClick={onSaveConfiguration}>
              💾 Save Configuration
            </Button>
          </div>
        </div>
      </div>

      <div className="sg-customizer-layout">
        <div className="sg-sidebar-icons">
          <button
            type="button"
            className={`sg-sidebar-icon-btn ${websitePanel === "template" ? "active" : ""}`}
            onClick={() => setWebsitePanel("template")}
          >
            <span>📊</span>
            <span>Template</span>
          </button>
          <button
            type="button"
            className={`sg-sidebar-icon-btn ${websitePanel === "header" ? "active" : ""}`}
            onClick={() => setWebsitePanel("header")}
          >
            <span>🖼️</span>
            <span>Header</span>
          </button>
          <button
            type="button"
            className={`sg-sidebar-icon-btn ${websitePanel === "sections" ? "active" : ""}`}
            onClick={() => setWebsitePanel("sections")}
          >
            <span>🧩</span>
            <span>Sections</span>
          </button>
          <button
            type="button"
            className={`sg-sidebar-icon-btn ${websitePanel === "footer" ? "active" : ""}`}
            onClick={() => setWebsitePanel("footer")}
          >
            <span>📑</span>
            <span>Footer</span>
          </button>
          <button
            type="button"
            className={`sg-sidebar-icon-btn ${websitePanel === "extras" ? "active" : ""}`}
            onClick={() => setWebsitePanel("extras")}
          >
            <span>⚙️</span>
            <span>Extras</span>
          </button>
        </div>

        <div className="sg-customizer-panel">
          <div className="sg-panel-title">
            <h6>
              {websitePanel === "template" && "Template & Typography Config"}
              {websitePanel === "header" && "Header Configuration"}
              {websitePanel === "sections" && "Page Sections Config"}
              {websitePanel === "footer" && "Footer Configuration"}
              {websitePanel === "extras" && "Extras & SEO Metadata"}
            </h6>
          </div>

          <div className="sg-panel-body">
            {websitePanel === "template" && (
              <div className="settings-form-grid settings-form-grid--two">
                <Select
                  label="Active Template"
                  value={config.template}
                  onChange={(e) => onChangeConfig((prev) => ({ ...prev, template: e.target.value }))}
                  options={[
                    { value: "custom-template", label: "custom-template (The Rare Concept)" },
                    { value: "fashion-store-v2", label: "fashion-store-v2" },
                    { value: "modern-business-v1", label: "modern-business-v1" },
                  ]}
                />
                <Select
                  label="Theme Palette"
                  value={config.theme}
                  onChange={(e) => onChangeConfig((prev) => ({ ...prev, theme: e.target.value }))}
                  options={[
                    { value: "theme-rare", label: "theme-rare (Raw Natural Gold)" },
                    { value: "teal-emerald", label: "Teal Emerald" },
                    { value: "purple-indigo", label: "Purple Indigo" },
                  ]}
                />
                <Input
                  label="Primary Font Family"
                  value={config.primaryFont || "'Playfair Display', serif"}
                  onChange={(e) => onChangeConfig((prev) => ({ ...prev, primaryFont: e.target.value }))}
                />
                <Input
                  label="Secondary Font Family"
                  value={config.secondaryFont || "custom"}
                  onChange={(e) => onChangeConfig((prev) => ({ ...prev, secondaryFont: e.target.value }))}
                />
              </div>
            )}

            {websitePanel === "header" && (
              <HeaderConfigPanel
                config={config}
                menuItems={menuItems}
                loggedInMenuItems={loggedInMenuItems}
                announcements={announcements}
                onChangeConfig={onChangeConfig}
                onOpenHeaderColorsModal={() => setShowHeaderColorsModal(true)}
                onOpenHeaderExtrasModal={() => setShowHeaderExtrasModal(true)}
                onAddMenuItem={() => {
                  setMenuItemModalState({
                    isOpen: true,
                    title: "Add Menu Item",
                    initialData: { title: "", linkType: "Internal Page", internalPage: "Home", icon: "", parentMenu: "top-level" },
                    onSubmit: (data) => setMenuItems((prev) => [...prev, { title: data.title, link: data.internalPage.toLowerCase().replace(/\s+/g, "-") }]),
                  });
                }}
                onEditMenuItem={(idx) => {
                  const item = menuItems[idx];
                  setMenuItemModalState({
                    isOpen: true,
                    title: item.title,
                    initialData: { title: item.title, linkType: "Internal Page", internalPage: item.title, icon: "", parentMenu: "top-level" },
                    onSubmit: (data) => setMenuItems((prev) => { const n = [...prev]; n[idx] = { title: data.title, link: data.internalPage.toLowerCase().replace(/\s+/g, "-") }; return n; }),
                  });
                }}
                onDeleteMenuItem={(idx) => setMenuItems((prev) => prev.filter((_, i) => i !== idx))}
                onAddLoggedInMenuItem={() => {
                  setLoggedInMenuItemModalState({
                    isOpen: true,
                    title: "Add Logged-in Menu Item",
                    initialData: { title: "", linkType: "Internal Page", link: "account", icon: "fa fa-desktop", iconImage: "https://example.com/icon.png" },
                    onSubmit: (data) => setLoggedInMenuItems((prev) => [...prev, { title: data.title, link: data.link || data.title.toLowerCase().replace(/\s+/g, "-") }]),
                  });
                }}
                onEditLoggedInMenuItem={(idx) => {
                  const item = loggedInMenuItems[idx];
                  setLoggedInMenuItemModalState({
                    isOpen: true,
                    title: item.title,
                    initialData: { title: item.title, linkType: "Internal Page", link: item.link, icon: "fa fa-desktop", iconImage: "https://example.com/icon.png" },
                    onSubmit: (data) => setLoggedInMenuItems((prev) => { const n = [...prev]; n[idx] = { title: data.title, link: data.link || data.title.toLowerCase().replace(/\s+/g, "-") }; return n; }),
                  });
                }}
                onDeleteLoggedInMenuItem={(idx) => setLoggedInMenuItems((prev) => prev.filter((_, i) => i !== idx))}
                onAddAnnouncement={() => {
                  setAnnouncementModalState({
                    isOpen: true,
                    title: `Announcement ${announcements.length + 1}`,
                    initialData: { title: "", fontSize: "14", textColor: "#FFFFFF", bgColor: "#4A0404", link: "" },
                    onSubmit: (data) => setAnnouncements((prev) => [...prev, data.title]),
                  });
                }}
                onEditAnnouncement={(idx) => {
                  const text = announcements[idx];
                  setAnnouncementModalState({
                    isOpen: true,
                    title: `Announcement ${idx + 1}`,
                    initialData: { title: text, fontSize: "14", textColor: "#FFFFFF", bgColor: "#4A0404", link: "" },
                    onSubmit: (data) => setAnnouncements((prev) => { const n = [...prev]; n[idx] = data.title; return n; }),
                  });
                }}
                onDeleteAnnouncement={(idx) => setAnnouncements((prev) => prev.filter((_, i) => i !== idx))}
                onOpenResponsiveModal={() => setAnnouncementResponsiveOpen(true)}
              />
            )}

            {websitePanel === "sections" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span>Total Sections: {config.sections.length}</span>
                  <Button variant="primary" size="sm" onClick={onAddSection}>
                    + Add Section
                  </Button>
                </div>
                {config.sections.map((sec, idx) => (
                  <div key={sec.id} className="sg-section-card" style={{ marginBottom: 12 }}>
                    <div className="sg-section-header" onClick={() => onToggleSectionIdx(idx)}>
                      <span>
                        Section {idx + 1}: {sec.id} - {sec.title || "Untitled"}
                      </span>
                      <button type="button" className="sg-btn-danger" onClick={(e) => onRemoveSection(idx, e)}>
                        🗑️
                      </button>
                    </div>

                    {openSectionIdx === idx && (
                      <div className="sg-section-body">
                        <div className="settings-form-grid settings-form-grid--two">
                          <Input
                            label="Section ID"
                            value={sec.id}
                            onChange={(e) => {
                              const newSecs = [...config.sections];
                              newSecs[idx].id = e.target.value;
                              onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                            }}
                          />
                          <Select
                            label="Section Layout"
                            value={sec.layout}
                            onChange={(e) => {
                              const newSecs = [...config.sections];
                              newSecs[idx].layout = e.target.value;
                              onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                            }}
                            options={SECTION_LAYOUT_TYPES}
                          />
                          <Input
                            label="Section Title"
                            value={sec.title}
                            onChange={(e) => {
                              const newSecs = [...config.sections];
                              newSecs[idx].title = e.target.value;
                              onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                            }}
                          />
                          <Select
                            label="Aspect Ratio"
                            value={sec.aspectRatio || "16:9"}
                            onChange={(e) => {
                              const newSecs = [...config.sections];
                              newSecs[idx].aspectRatio = e.target.value;
                              onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                            }}
                            options={ASPECT_RATIO_PRESETS}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {websitePanel === "footer" && (
              <FooterConfigPanel
                footerMenuItems={footerMenuItems}
                footerSocialMedia={footerSocialMedia}
                footerColumns={footerColumns}
                onOpenFooterLayoutModal={() => setShowFooterLayoutModal(true)}
                onOpenFooterColorsModal={() => setShowFooterColorsModal(true)}
                onAddFooterMenuItem={() => {
                  setFooterMenuItemModalState({
                    isOpen: true,
                    title: `Menu ${footerMenuItems.length}`,
                    initialData: { title: "Home", displayName: "", visible: true, link: "", icon: "" },
                    onSubmit: (data) => setFooterMenuItems((prev) => [...prev, data.title]),
                  });
                }}
                onDeleteFooterMenuItem={(idx) => setFooterMenuItems((prev) => prev.filter((_, i) => i !== idx))}
                onAddFooterSocial={() => {
                  setFooterSocialModalState({ isOpen: true, editingIndex: null });
                }}
                onEditFooterSocial={(idx) => {
                  setFooterSocialModalState({
                    isOpen: true,
                    editingIndex: idx,
                    initialData: footerSocialMedia[idx],
                  });
                }}
                onDeleteFooterSocial={(idx) => setFooterSocialMedia((prev) => prev.filter((_, i) => i !== idx))}
                onAddFooterColumn={() => {
                  setModalConfig({
                    isOpen: true,
                    title: "Add Footer Column",
                    subtitle: "Add and edit column headers.",
                    inputLabel: "Column Header Title",
                    placeholder: "e.g. Customer Care, Quick Links",
                    onSubmit: (val) => setFooterColumns((prev) => [...prev, val]),
                  });
                }}
                onEditFooterColumn={(idx) => {
                  setModalConfig({
                    isOpen: true,
                    title: "Edit Footer Column",
                    inputLabel: "Column Header Title",
                    initialValue: footerColumns[idx],
                    onSubmit: (val) => setFooterColumns((prev) => { const n = [...prev]; n[idx] = val; return n; }),
                  });
                }}
                onDeleteFooterColumn={(idx) => setFooterColumns((prev) => prev.filter((_, i) => i !== idx))}
              />
            )}

            {websitePanel === "extras" && (
              <div className="settings-form-grid settings-form-grid--two">
                <Input
                  label="SEO Page Title"
                  value={config.seo.title}
                  onChange={(e) => onChangeConfig((prev) => ({ ...prev, seo: { ...prev.seo, title: e.target.value } }))}
                />
                <Input
                  label="Canonical URL"
                  value={config.seo.canonicalUrl}
                  onChange={(e) => onChangeConfig((prev) => ({ ...prev, seo: { ...prev.seo, canonicalUrl: e.target.value } }))}
                />
                <div style={{ gridColumn: "1 / -1" }}>
                  <Textarea
                    label="SEO Meta Description"
                    value={config.seo.description}
                    rows={3}
                    onChange={(e) => onChangeConfig((prev) => ({ ...prev, seo: { ...prev.seo, description: e.target.value } }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {showLivePreview && (
          <div className="sg-live-preview">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span className="sg-preview-badge">DOCKED PREVIEW</span>
              <div style={{ display: "flex", gap: 6, background: "#e2e8f0", padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  style={{
                    border: "none",
                    background: deviceFrame === "desktop" ? "#ffffff" : "transparent",
                    color: deviceFrame === "desktop" ? "#0f172a" : "#64748b",
                    boxShadow: deviceFrame === "desktop" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => setDeviceFrame("desktop")}
                >
                  💻 Desktop
                </button>
                <button
                  type="button"
                  style={{
                    border: "none",
                    background: deviceFrame === "tablet" ? "#ffffff" : "transparent",
                    color: deviceFrame === "tablet" ? "#0f172a" : "#64748b",
                    boxShadow: deviceFrame === "tablet" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => setDeviceFrame("tablet")}
                >
                  📱 Tablet (768px)
                </button>
                <button
                  type="button"
                  style={{
                    border: "none",
                    background: deviceFrame === "mobile" ? "#ffffff" : "transparent",
                    color: deviceFrame === "mobile" ? "#0f172a" : "#64748b",
                    boxShadow: deviceFrame === "mobile" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => setDeviceFrame("mobile")}
                >
                  📱 Mobile (375px)
                </button>
              </div>
            </div>

            <div
              className="sg-preview-site"
              style={{
                maxWidth: deviceFrame === "mobile" ? 375 : deviceFrame === "tablet" ? 768 : "100%",
                margin: deviceFrame === "desktop" ? 0 : "0 auto",
                transition: "all 0.3s ease-in-out",
                borderRadius: deviceFrame === "desktop" ? 12 : 16,
                boxShadow: deviceFrame === "desktop" ? "none" : "0 8px 30px rgba(0,0,0,0.15)",
              }}
            >
              <SiteHeader
                logo={config.logo}
                title={config.seo?.title || config.header?.title || "The Rare Concept"}
                description={config.header?.description}
                variant={(config.header?.name as any) || "fashion"}
                menu={menuItems}
                topTickerText={announcements[0] || "Free Shipping on Orders Worth ₹500/-"}
                headerBgColor={config.header?.headerBgColor || "#FFFFFF"}
                headerTextColor={config.header?.headerTextColor || "#1C1917"}
                tickerBgColor={config.header?.tickerBgColor || "#4A0404"}
                showCart={headerExtrasState.cart.enabled}
                showSearch={headerExtrasState.search.enabled}
                showWishlist={headerExtrasState.wishlist.enabled}
                showLogin={headerExtrasState.login.enabled}
                userName={headerExtrasState.login.displayName || "Account"}
              />
              <main style={{ marginTop: 16 }}>
                {config.sections
                  .filter((sec) => sec.visible !== false)
                  .map((sec) => (
                    <div key={sec.id} className="sg-mock-section">
                    <h5 style={{ fontFamily: config.primaryFont }}>{sec.title}</h5>
                    <p>{sec.subTitle}</p>
                    <div className="sg-mock-content-grid">
                      {sec.content.map((c) => (
                        <div key={c.id}>
                          {sec.layout === "banner" ? (
                            <BannerCard content={c} />
                          ) : sec.layout === "testimonials" ? (
                            <TestimonialCard content={c} />
                          ) : sec.layout === "blogType1" ? (
                            <BlogCard content={c} />
                          ) : (
                            <ServiceCard content={c} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </main>
            </div>
          </div>
        )}
      </div>

      <FooterModals
        showFooterLayoutModal={showFooterLayoutModal}
        showFooterColorsModal={showFooterColorsModal}
        footerState={footerState}
        onChangeFooterState={onChangeFooterState}
        onCloseFooterLayoutModal={() => setShowFooterLayoutModal(false)}
        onCloseFooterColorsModal={() => setShowFooterColorsModal(false)}
      />

      <ColorChooserModal
        isOpen={showHeaderColorsModal}
        title="Header Colors"
        foregroundColor={config.header?.headerTextColor || "#1C1917"}
        backgroundColor={config.header?.headerBgColor || "#FFFFFF"}
        accentColor={config.header?.tickerBgColor || "#4A0404"}
        onChangeForegroundColor={(val) => onChangeConfig((prev) => ({ ...prev, header: { ...prev.header, headerTextColor: val } }))}
        onChangeBackgroundColor={(val) => onChangeConfig((prev) => ({ ...prev, header: { ...prev.header, headerBgColor: val } }))}
        onChangeAccentColor={(val) => onChangeConfig((prev) => ({ ...prev, header: { ...prev.header, tickerBgColor: val } }))}
        onClose={() => setShowHeaderColorsModal(false)}
      />

      <AddEditItemModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        inputLabel={modalConfig.inputLabel}
        initialValue={modalConfig.initialValue}
        placeholder={modalConfig.placeholder}
        onSubmit={modalConfig.onSubmit}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      <FooterSocialModal
        isOpen={footerSocialModalState.isOpen}
        modalTitle={footerSocialModalState.editingIndex === null ? "Add Social Media Item" : footerSocialMedia[footerSocialModalState.editingIndex]?.platform}
        initialData={footerSocialModalState.initialData}
        onSubmit={(data) => {
          setFooterSocialMedia((previous) => {
            if (footerSocialModalState.editingIndex === null) return [...previous, data];
            const next = [...previous];
            next[footerSocialModalState.editingIndex] = data;
            return next;
          });
        }}
        onClose={() => setFooterSocialModalState({ isOpen: false, editingIndex: null })}
      />

      <HeaderExtrasModal
        isOpen={showHeaderExtrasModal}
        state={headerExtrasState}
        onChangeState={onChangeHeaderExtrasState}
        onClose={() => setShowHeaderExtrasModal(false)}
      />

      <MenuItemModal
        isOpen={menuItemModalState.isOpen}
        modalTitle={menuItemModalState.title}
        initialData={menuItemModalState.initialData}
        parentMenuOptions={[{ value: "top-level", label: "-- Top Level --" }, ...menuItems.map((m) => ({ value: m.title, label: m.title }))]}
        onSubmit={menuItemModalState.onSubmit}
        onClose={() => setMenuItemModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      <LoggedInMenuItemModal
        isOpen={loggedInMenuItemModalState.isOpen}
        modalTitle={loggedInMenuItemModalState.title}
        initialData={loggedInMenuItemModalState.initialData}
        onSubmit={loggedInMenuItemModalState.onSubmit}
        onClose={() => setLoggedInMenuItemModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      <AnnouncementModal
        isOpen={announcementModalState.isOpen}
        modalTitle={announcementModalState.title}
        initialData={announcementModalState.initialData}
        onSubmit={announcementModalState.onSubmit}
        onClose={() => setAnnouncementModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      <AnnouncementResponsiveModal
        isOpen={announcementResponsiveOpen}
        initialData={announcementResponsiveData}
        onSubmit={(data) => setAnnouncementResponsiveData(data)}
        onClose={() => setAnnouncementResponsiveOpen(false)}
      />

      <FooterMenuItemModal
        isOpen={footerMenuItemModalState.isOpen}
        modalTitle={footerMenuItemModalState.title}
        initialData={footerMenuItemModalState.initialData}
        onSubmit={footerMenuItemModalState.onSubmit}
        onClose={() => setFooterMenuItemModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
