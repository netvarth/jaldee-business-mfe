import React, { useState, useEffect } from "react";
import { Button, Input, Switch } from "@jaldee/design-system";

export interface ResponsiveBreakpoint {
  items: string;
  margin: string;
  loop: boolean;
  autoplay: boolean;
  timeout: string;
  dots: boolean;
  center: boolean;
  nav: boolean;
}

export interface AnnouncementResponsiveData {
  mobile: ResponsiveBreakpoint;
  tablet: ResponsiveBreakpoint;
  desktop: ResponsiveBreakpoint;
}

const defaultBreakpoint: ResponsiveBreakpoint = {
  items: "1",
  margin: "0",
  loop: false,
  autoplay: false,
  timeout: "3000",
  dots: false,
  center: false,
  nav: false,
};

export interface AnnouncementResponsiveModalProps {
  isOpen: boolean;
  initialData?: Partial<AnnouncementResponsiveData>;
  onSubmit: (data: AnnouncementResponsiveData) => void;
  onClose: () => void;
}

export function AnnouncementResponsiveModal({
  isOpen,
  initialData,
  onSubmit,
  onClose,
}: AnnouncementResponsiveModalProps) {
  const [mobile, setMobile] = useState<ResponsiveBreakpoint>({ ...defaultBreakpoint, ...initialData?.mobile });
  const [tablet, setTablet] = useState<ResponsiveBreakpoint>({ ...defaultBreakpoint, ...initialData?.tablet });
  const [desktop, setDesktop] = useState<ResponsiveBreakpoint>({ ...defaultBreakpoint, ...initialData?.desktop });

  useEffect(() => {
    if (isOpen) {
      setMobile({ ...defaultBreakpoint, ...initialData?.mobile });
      setTablet({ ...defaultBreakpoint, ...initialData?.tablet });
      setDesktop({ ...defaultBreakpoint, ...initialData?.desktop });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({ mobile, tablet, desktop });
    onClose();
  };

  const updateMobile = (key: keyof ResponsiveBreakpoint, val: string | boolean) =>
    setMobile((p) => ({ ...p, [key]: val }));
  const updateTablet = (key: keyof ResponsiveBreakpoint, val: string | boolean) =>
    setTablet((p) => ({ ...p, [key]: val }));
  const updateDesktop = (key: keyof ResponsiveBreakpoint, val: string | boolean) =>
    setDesktop((p) => ({ ...p, [key]: val }));

  const thStyle: React.CSSProperties = {
    textAlign: "center",
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
    padding: "10px 12px",
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: "#374151",
    fontWeight: 500,
    padding: "8px 12px",
    whiteSpace: "nowrap",
  };
  const cellStyle: React.CSSProperties = {
    padding: "6px 12px",
    textAlign: "center",
    verticalAlign: "middle",
  };

  type BoolKey = "loop" | "autoplay" | "dots" | "center" | "nav";
  type StringKey = "items" | "margin" | "timeout";

  const textRow = (label: string, field: StringKey) => (
    <tr key={field} style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={labelStyle}>{label}</td>
      <td style={cellStyle}>
        <Input
          value={mobile[field]}
          onChange={(e) => updateMobile(field, e.target.value)}
          placeholder=""
          fullWidth
        />
      </td>
      <td style={cellStyle}>
        <Input
          value={tablet[field]}
          onChange={(e) => updateTablet(field, e.target.value)}
          placeholder=""
          fullWidth
        />
      </td>
      <td style={cellStyle}>
        <Input
          value={desktop[field]}
          onChange={(e) => updateDesktop(field, e.target.value)}
          placeholder=""
          fullWidth
        />
      </td>
    </tr>
  );

  const toggleRow = (label: string, field: BoolKey) => (
    <tr key={field} style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={labelStyle}>{label}</td>
      <td style={cellStyle}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Switch checked={mobile[field]} onChange={(v) => updateMobile(field, v)} />
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Switch checked={tablet[field]} onChange={(v) => updateTablet(field, v)} />
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Switch checked={desktop[field]} onChange={(v) => updateDesktop(field, v)} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="sg-modal-overlay">
      <div className="sg-modal-backdrop" onClick={onClose} />
      <div className="sg-modal-content" style={{ maxWidth: 820, padding: 24, borderRadius: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Announcement Responsive Settings
          </h5>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Table */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "26%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left" }}></th>
                <th style={thStyle}>Mobile</th>
                <th style={thStyle}>Tablet</th>
                <th style={thStyle}>Desktop</th>
              </tr>
            </thead>
            <tbody>
              {textRow("Items", "items")}
              {textRow("Margin", "margin")}
              {toggleRow("Loop", "loop")}
              {toggleRow("Autoplay", "autoplay")}
              {textRow("Timeout (ms)", "timeout")}
              {toggleRow("Dots", "dots")}
              {toggleRow("Center", "center")}
              {toggleRow("Nav", "nav")}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" onClick={handleSubmit}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
