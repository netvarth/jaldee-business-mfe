import React, { useState, useEffect } from "react";
import { Button, Input, Select, Switch } from "@jaldee/design-system";

export interface FooterSocialData {
  platform: string;
  url: string;
  icon: string;
  iconUrl: string;
  visible: boolean;
}

export interface FooterSocialModalProps {
  isOpen: boolean;
  modalTitle?: string;
  initialData?: Partial<FooterSocialData>;
  onSubmit: (data: FooterSocialData) => void;
  onClose: () => void;
}

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter / X" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "pinterest", label: "Pinterest" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
];

const ICON_MAP: Record<string, string> = {
  instagram: "fa-instagram",
  facebook: "fa-facebook",
  twitter: "fa-twitter",
  youtube: "fa-youtube",
  linkedin: "fa-linkedin",
  pinterest: "fa-pinterest",
  tiktok: "fa-tiktok",
  whatsapp: "fa-whatsapp",
};

const defaultData: FooterSocialData = {
  platform: "instagram",
  url: "",
  icon: "fa-instagram",
  iconUrl: "",
  visible: true,
};

export function FooterSocialModal({
  isOpen,
  modalTitle,
  initialData,
  onSubmit,
  onClose,
}: FooterSocialModalProps) {
  const [data, setData] = useState<FooterSocialData>({ ...defaultData, ...initialData });

  useEffect(() => {
    if (isOpen) {
      setData({ ...defaultData, ...initialData });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const update = <K extends keyof FooterSocialData>(key: K, val: FooterSocialData[K]) =>
    setData((prev) => ({ ...prev, [key]: val }));

  const handlePlatformChange = (platform: string) => {
    setData((prev) => ({
      ...prev,
      platform,
      icon: ICON_MAP[platform] ?? `fa-${platform}`,
    }));
  };

  const handleSubmit = () => {
    onSubmit(data);
    onClose();
  };

  const title = modalTitle ?? data.platform;

  return (
    <div className="sg-modal-overlay">
      <div className="sg-modal-backdrop" onClick={onClose} />
      <div className="sg-modal-content" style={{ maxWidth: 700, padding: 24, borderRadius: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {title}
          </h5>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Form Card */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {/* Row 1: Platform + URL + Icon */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", gap: 16, marginBottom: 16 }}>
            <Select
              label="Platform"
              value={data.platform}
              onChange={(e) => handlePlatformChange(e.target.value)}
              options={PLATFORM_OPTIONS}
            />
            <Input
              label="URL"
              value={data.url}
              placeholder="https://..."
              onChange={(e) => update("url", e.target.value)}
              fullWidth
            />
            <Input
              label="Icon"
              value={data.icon}
              placeholder="fa-instagram"
              onChange={(e) => update("icon", e.target.value)}
              fullWidth
            />
          </div>

          {/* Row 2: Icon URL + Visible */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "end" }}>
            <Input
              label="Icon URL"
              value={data.iconUrl}
              placeholder="https://.../icon.png"
              onChange={(e) => update("iconUrl", e.target.value)}
              fullWidth
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6 }}>
              <Switch
                checked={data.visible}
                onChange={(v) => update("visible", v)}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Visible</span>
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
