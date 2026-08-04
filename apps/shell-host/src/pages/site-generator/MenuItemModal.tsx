import React, { useState, useEffect } from "react";
import { Button, Input, Select } from "@jaldee/design-system";

export interface MenuItemData {
  title: string;
  linkType: string;
  internalPage: string;
  icon: string;
  parentMenu: string;
}

export interface MenuItemModalProps {
  isOpen: boolean;
  modalTitle?: string;
  initialData?: Partial<MenuItemData>;
  availablePages?: string[];
  parentMenuOptions?: { value: string; label: string }[];
  onSubmit: (data: MenuItemData) => void;
  onClose: () => void;
}

export function MenuItemModal({
  isOpen,
  modalTitle = "Menu Item Settings",
  initialData,
  availablePages = ["Home", "Shop", "Our Story", "What We Don't Do", "Contact Us", "Gifting"],
  parentMenuOptions = [{ value: "top-level", label: "-- Top Level --" }],
  onSubmit,
  onClose,
}: MenuItemModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [linkType, setLinkType] = useState(initialData?.linkType || "Internal Page");
  const [internalPage, setInternalPage] = useState(initialData?.internalPage || "Home");
  const [icon, setIcon] = useState(initialData?.icon || "");
  const [parentMenu, setParentMenu] = useState(initialData?.parentMenu || "top-level");

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "");
      setLinkType(initialData?.linkType || "Internal Page");
      setInternalPage(initialData?.internalPage || "Home");
      setIcon(initialData?.icon || "");
      setParentMenu(initialData?.parentMenu || "top-level");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        linkType,
        internalPage,
        icon: icon.trim(),
        parentMenu,
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
              placeholder="e.g., Gifting"
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

          {/* Row 2: Internal Page & Icon */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <Select
              label="Internal Page"
              value={internalPage}
              onChange={(e) => setInternalPage(e.target.value)}
              options={availablePages.map((p) => ({ value: p, label: p }))}
              fullWidth
            />

            <Input
              label="Icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g., fa-home"
              fullWidth
            />
          </div>

          {/* Row 3: Parent Menu */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Select
              label="Parent Menu"
              value={parentMenu}
              onChange={(e) => setParentMenu(e.target.value)}
              options={parentMenuOptions}
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
