import React, { useState, useEffect } from "react";
import { Button, Input, Select } from "@jaldee/design-system";

export interface LoggedInMenuItemData {
  title: string;
  linkType: string;
  link: string;
  icon: string;
  iconImage: string;
}

export interface LoggedInMenuItemModalProps {
  isOpen: boolean;
  modalTitle?: string;
  initialData?: Partial<LoggedInMenuItemData>;
  onSubmit: (data: LoggedInMenuItemData) => void;
  onClose: () => void;
}

export function LoggedInMenuItemModal({
  isOpen,
  modalTitle = "Logged-in Menu Item Settings",
  initialData,
  onSubmit,
  onClose,
}: LoggedInMenuItemModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [linkType, setLinkType] = useState(initialData?.linkType || "Internal Page");
  const [link, setLink] = useState(initialData?.link || "");
  const [icon, setIcon] = useState(initialData?.icon || "");
  const [iconImage, setIconImage] = useState(initialData?.iconImage || "");

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "");
      setLinkType(initialData?.linkType || "Internal Page");
      setLink(initialData?.link || "");
      setIcon(initialData?.icon || "");
      setIconImage(initialData?.iconImage || "https://example.com/icon.png");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        linkType,
        link: link.trim(),
        icon: icon.trim(),
        iconImage: iconImage.trim(),
      });
      onClose();
    }
  };

  return (
    <div className="sg-modal-overlay">
      <div className="sg-modal-backdrop" onClick={onClose} />
      <div className="sg-modal-content" style={{ maxWidth: 780, padding: 24, borderRadius: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {title || modalTitle}
          </h5>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Card Box */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 20,
            backgroundColor: "#f8fafc",
            marginBottom: 24,
          }}
        >
          {/* Row 1: Title & Link Type */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Dashboard"
              fullWidth
            />

            <Select
              label="Link Type"
              value={linkType}
              onChange={(e) => setLinkType(e.target.value)}
              options={[
                { value: "Internal Page", label: "Internal Page" },
                { value: "External URL", label: "External URL" },
                { value: "Section Link", label: "Section Link" },
              ]}
              fullWidth
            />
          </div>

          {/* Row 2: Link & Icon */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <Input
              label="Link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="e.g., account"
              fullWidth
            />

            <Input
              label="Icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g., fa fa-desktop"
              fullWidth
            />
          </div>

          {/* Row 3: Icon Image */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Input
              label="Icon Image"
              value={iconImage}
              onChange={(e) => setIconImage(e.target.value)}
              placeholder="https://example.com/icon.png"
              fullWidth
            />
          </div>
        </div>

        {/* Footer Action */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" onClick={() => handleSubmit()}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
