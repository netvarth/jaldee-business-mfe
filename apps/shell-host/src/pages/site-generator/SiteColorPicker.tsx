import React from "react";
import { Input } from "@jaldee/design-system";

export interface SiteColorPickerProps {
  label?: string;
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
}

const DEFAULT_PRESETS = [
  "#4A0404", // Maroon
  "#78350F", // Amber
  "#D97706", // Gold
  "#065F46", // Emerald
  "#312E81", // Indigo
  "#1C1917", // Charcoal
  "#FFFFFF", // White
  "#FF0000", // Red
];

export function SiteColorPicker({
  label,
  value = "#000000",
  onChange,
  placeholder = "#000000",
}: SiteColorPickerProps) {
  const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(value || "");
  const nativeColorValue = isValidHex ? value : "#000000";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
          {label}
        </label>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            fullWidth
          />
        </div>

        {/* Interactive Native Color Picker Swatch */}
        <div
          style={{
            position: "relative",
            width: 38,
            height: 38,
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            backgroundColor: value || "#000000",
            overflow: "hidden",
            cursor: "pointer",
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
          title="Click to open color picker"
        >
          <input
            type="color"
            value={nativeColorValue}
            onChange={(e) => onChange?.(e.target.value)}
            style={{
              position: "absolute",
              top: -10,
              left: -10,
              width: 60,
              height: 60,
              opacity: 0,
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* Color Presets Palette */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
        {DEFAULT_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: color,
              border: "1px solid #cbd5e1",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              padding: 0,
            }}
            onClick={() => onChange?.(color)}
            title={`Select ${color}`}
          />
        ))}
      </div>
    </div>
  );
}
