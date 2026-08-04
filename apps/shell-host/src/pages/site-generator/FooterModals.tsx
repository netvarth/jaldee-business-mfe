import React from "react";
import { Button, Input, Select, Switch, Textarea, RichTextEditor, FileUpload } from "@jaldee/design-system";
import { FooterState } from "./siteGeneratorTypes";
import { SiteColorPicker } from "./SiteColorPicker";

export interface FooterModalsProps {
  showFooterLayoutModal: boolean;
  showFooterColorsModal: boolean;
  footerState: FooterState;
  onChangeFooterState: React.Dispatch<React.SetStateAction<FooterState>>;
  onCloseFooterLayoutModal: () => void;
  onCloseFooterColorsModal: () => void;
}

export function FooterModals({
  showFooterLayoutModal,
  showFooterColorsModal,
  footerState,
  onChangeFooterState,
  onCloseFooterLayoutModal,
  onCloseFooterColorsModal,
}: FooterModalsProps) {
  return (
    <>
      {/* Footer Layout Modal */}
      {showFooterLayoutModal && (
        <div className="sg-modal-overlay">
          <div className="sg-modal-backdrop" onClick={onCloseFooterLayoutModal} />
          <div className="sg-modal-content" style={{ maxWidth: 800 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Footer Layout</h5>
              <Button variant="secondary" size="sm" onClick={onCloseFooterLayoutModal}>
                Close
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Switch
                  checked={footerState.visible}
                  onChange={(checked) => onChangeFooterState((prev) => ({ ...prev, visible: checked }))}
                />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Visible</span>
              </div>

              <div className="settings-form-grid settings-form-grid--two">
                <Select
                  label="Variant"
                  value={footerState.variant}
                  onChange={(e) => onChangeFooterState((prev) => ({ ...prev, variant: e.target.value }))}
                  options={[
                    { value: "Fashion 4 Column", label: "Fashion 4 Column" },
                    { value: "Minimal 2 Column", label: "Minimal 2 Column" },
                    { value: "Modern Grid", label: "Modern Grid" },
                  ]}
                />
                <Input
                  label="Title *"
                  value={footerState.title}
                  onChange={(e) => onChangeFooterState((prev) => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  label="Copyright"
                  value={footerState.copyright}
                  rows={2}
                  onChange={(e) => onChangeFooterState((prev) => ({ ...prev, copyright: e.target.value }))}
                />
                <Input
                  label="Brand Name"
                  value={footerState.brandName}
                  onChange={(e) => onChangeFooterState((prev) => ({ ...prev, brandName: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Switch
                  checked={footerState.showDivider}
                  onChange={(checked) => onChangeFooterState((prev) => ({ ...prev, showDivider: checked }))}
                />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Show Divider</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Address Line 1</label>
                  <Textarea
                    value={footerState.addressLine1}
                    rows={2}
                    onChange={(e) => onChangeFooterState((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Address Line 2</label>
                  <Textarea
                    value={footerState.addressLine2}
                    rows={2}
                    onChange={(e) => onChangeFooterState((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Description</label>
                <RichTextEditor
                  value={footerState.description}
                  onChange={(val) => onChangeFooterState((prev) => ({ ...prev, description: val }))}
                />
              </div>

              <div className="settings-form-grid settings-form-grid--two">
                <Select
                  label="Footer Logo Aspect Ratio"
                  value={footerState.logoAspectRatio}
                  onChange={(e) => onChangeFooterState((prev) => ({ ...prev, logoAspectRatio: e.target.value }))}
                  options={[
                    { value: "None", label: "None" },
                    { value: "1:1", label: "1:1 Square" },
                    { value: "16:9", label: "16:9 Widescreen" },
                  ]}
                />
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Footer Logo (Optional)</label>
                  <FileUpload
                    accept="image/*"
                    value={footerState.footerLogo ? [{ name: "logo", url: footerState.footerLogo }] : []}
                    onChange={(files) => {
                      const url = files[0]?.url ?? "";
                      onChangeFooterState((prev) => ({ ...prev, footerLogo: url }));
                    }}
                  />
                  <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>Leave empty to use the main logo.</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <Button variant="primary" size="md" onClick={onCloseFooterLayoutModal}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Colors Modal */}
      {showFooterColorsModal && (
        <div className="sg-modal-overlay">
          <div className="sg-modal-backdrop" onClick={onCloseFooterColorsModal} />
          <div className="sg-modal-content" style={{ maxWidth: 650 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Footer Colors</h5>
              <Button variant="secondary" size="sm" onClick={onCloseFooterColorsModal}>
                Close
              </Button>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
              <h6 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>Colors</h6>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <SiteColorPicker
                  label="Foreground Color"
                  value={footerState.foregroundColor}
                  onChange={(val) => onChangeFooterState((prev) => ({ ...prev, foregroundColor: val }))}
                  placeholder="Hex, RGB, or named color"
                />
                <SiteColorPicker
                  label="Background Color"
                  value={footerState.backgroundColor}
                  onChange={(val) => onChangeFooterState((prev) => ({ ...prev, backgroundColor: val }))}
                  placeholder="#ff0000"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <Button variant="primary" size="md" onClick={onCloseFooterColorsModal}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
