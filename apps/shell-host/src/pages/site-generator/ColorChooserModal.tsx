import React from "react";
import { Button } from "@jaldee/design-system";
import { SiteColorPicker } from "./SiteColorPicker";

export interface ColorChooserModalProps {
  isOpen: boolean;
  title?: string;
  foregroundColor: string;
  backgroundColor: string;
  accentColor?: string;
  onChangeForegroundColor: (val: string) => void;
  onChangeBackgroundColor: (val: string) => void;
  onChangeAccentColor?: (val: string) => void;
  onClose: () => void;
}

export function ColorChooserModal({
  isOpen,
  title = "Choose Colors",
  foregroundColor,
  backgroundColor,
  accentColor = "#4A0404",
  onChangeForegroundColor,
  onChangeBackgroundColor,
  onChangeAccentColor,
  onClose,
}: ColorChooserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="sg-modal-overlay">
      <div className="sg-modal-backdrop" onClick={onClose} />
      <div className="sg-modal-content" style={{ maxWidth: 650 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h5>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, background: "#ffffff" }}>
          <h6 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
            Color Palette & Typography Styling
          </h6>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SiteColorPicker
              label="Foreground / Text Color"
              value={foregroundColor}
              onChange={onChangeForegroundColor}
              placeholder="Hex, RGB, or named color"
            />

            <SiteColorPicker
              label="Background Color"
              value={backgroundColor}
              onChange={onChangeBackgroundColor}
              placeholder="#ffffff"
            />

            {onChangeAccentColor && (
              <SiteColorPicker
                label="Accent / Top Ticker Color"
                value={accentColor}
                onChange={onChangeAccentColor}
                placeholder="#4A0404"
              />
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
