import React, { useState, useEffect } from "react";
import { Button, Input, Select, Switch } from "@jaldee/design-system";

export interface FooterMenuItemData {
  title: string;
  displayName: string;
  visible: boolean;
  link: string;
  icon: string;
}

export interface FooterMenuItemModalProps {
  isOpen: boolean;
  modalTitle?: string;
  initialData?: Partial<FooterMenuItemData>;
  onSubmit: (data: FooterMenuItemData) => void;
  onClose: () => void;
}

const PAGE_OPTIONS = [
  { value: "Home", label: "Home" },
  { value: "Shop", label: "Shop" },
  { value: "About", label: "About" },
  { value: "Contact", label: "Contact" },
  { value: "Blogs", label: "Blogs" },
  { value: "Policy", label: "Policy" },
  { value: "News", label: "News" },
];

const defaultData: FooterMenuItemData = {
  title: "Home",
  displayName: "",
  visible: true,
  link: "",
  icon: "",
};

export function FooterMenuItemModal({
  isOpen,
  modalTitle,
  initialData,
  onSubmit,
  onClose,
}: FooterMenuItemModalProps) {
  const [data, setData] = useState<FooterMenuItemData>({ ...defaultData, ...initialData });

  useEffect(() => {
    if (isOpen) {
      setData({ ...defaultData, ...initialData });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const update = (key: keyof FooterMenuItemData, val: string | boolean) =>
    setData((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    onSubmit(data);
    onClose();
  };

  return (
    <div className="sg-modal-overlay">
      <div className="sg-modal-backdrop" onClick={onClose} />
      <div className="sg-modal-content" style={{ maxWidth: 680, padding: 24, borderRadius: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {modalTitle ?? "Menu Item"}
          </h5>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Form Card */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {/* Row 1: Title + Display Name + Visible */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end", marginBottom: 16 }}>
            <Select
              label="Title *"
              value={data.title}
              onChange={(e) => update("title", e.target.value)}
              options={PAGE_OPTIONS}
            />
            <Input
              label="Display Name"
              value={data.displayName}
              placeholder="Display Name"
              onChange={(e) => update("displayName", e.target.value)}
              fullWidth
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 2 }}>
              <Switch
                checked={data.visible}
                onChange={(v) => update("visible", v)}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Visible</span>
            </div>
          </div>

          {/* Row 2: Link/Value + Icon */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Input
              label="Link/Value"
              value={data.link}
              placeholder="URL or value"
              onChange={(e) => update("link", e.target.value)}
              fullWidth
            />
            <div>
              <Input
                label="Icon"
                value={data.icon}
                placeholder="e.g., fa-envelope"
                onChange={(e) => update("icon", e.target.value)}
                fullWidth
              />
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b" }}>Font Awesome icon class</p>
            </div>
          </div>
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
