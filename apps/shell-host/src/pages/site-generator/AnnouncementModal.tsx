import React, { useState, useEffect } from "react";
import { Button, Input, RichTextEditor } from "@jaldee/design-system";
import { SiteColorPicker } from "./SiteColorPicker";

export interface AnnouncementData {
  title: string;
  fontSize: string;
  textColor: string;
  bgColor: string;
  link: string;
}

export interface AnnouncementModalProps {
  isOpen: boolean;
  modalTitle?: string;
  initialData?: Partial<AnnouncementData>;
  onSubmit: (data: AnnouncementData) => void;
  onClose: () => void;
}

export function AnnouncementModal({
  isOpen,
  modalTitle = "Announcement",
  initialData,
  onSubmit,
  onClose,
}: AnnouncementModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [fontSize, setFontSize] = useState(initialData?.fontSize || "14");
  const [textColor, setTextColor] = useState(initialData?.textColor || "#FFFFFF");
  const [bgColor, setBgColor] = useState(initialData?.bgColor || "#4A0404");
  const [link, setLink] = useState(initialData?.link || "");

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "");
      setFontSize(initialData?.fontSize || "14");
      setTextColor(initialData?.textColor || "#FFFFFF");
      setBgColor(initialData?.bgColor || "#4A0404");
      setLink(initialData?.link || "");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        fontSize,
        textColor,
        bgColor,
        link: link.trim(),
      });
      onClose();
    }
  };

  return (
    <div className="sg-modal-overlay">
      <div className="sg-modal-backdrop" onClick={onClose} />
      <div
        className="sg-modal-content"
        style={{
          maxWidth: 820,
          minHeight: "88vh",
          maxHeight: "95vh",
          overflowY: "auto",
          padding: 28,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          justify: "space-between",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {modalTitle}
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
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justify: "space-between",
          }}
        >
          {/* Title with Design System Rich Text Editor */}
          <div style={{ marginBottom: 16 }}>
            <RichTextEditor
              label="Title"
              value={title}
              onChange={(val) => setTitle(val)}
              placeholder="Enter announcement text..."
              minHeightClassName="min-h-[140px]"
              fullWidth
            />
          </div>

          {/* Font Size (px) */}
          <div style={{ maxWidth: "50%", marginBottom: 16 }}>
            <Input
              label="Font Size (px)"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              placeholder="e.g. 14"
              fullWidth
            />
          </div>

          {/* Text Color & Background Color */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <SiteColorPicker
              label="Text Color"
              value={textColor}
              onChange={setTextColor}
              placeholder="Hex, RGB, or named color"
            />
            <SiteColorPicker
              label="Background Color"
              value={bgColor}
              onChange={setBgColor}
              placeholder="Hex, RGB, or named color"
            />
          </div>

          {/* Link (Optional) */}
          <div>
            <Input
              label="Link (Optional)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="e.g. /offers or https://google.com"
              fullWidth
            />
            <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
              Users will be navigated to this link when clicking the announcement.
            </span>
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
