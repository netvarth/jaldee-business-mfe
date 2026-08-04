import React, { useState } from "react";
import { Button, Input } from "@jaldee/design-system";
import { CustomPageItem, DEFAULT_SECTIONS, SiteConfig, SAMPLE_S3_URL } from "./siteGeneratorTypes";

export interface ConfigGeneratorHomeProps {
  config: SiteConfig;
  tenantUid: string;
  isDetachedOpen: boolean;
  fetchingS3: boolean;
  onOpenDetachedPreview: () => void;
  onFetchFromS3: (url?: string) => void;
  onSelectPath: (path: string) => void;
  onCreateCustomPage: (name: string) => void;
  onRemoveCustomPage: (key: string, e: React.MouseEvent) => void;
}

export function ConfigGeneratorHome({
  config,
  tenantUid,
  isDetachedOpen,
  fetchingS3,
  onOpenDetachedPreview,
  onFetchFromS3,
  onSelectPath,
  onCreateCustomPage,
  onRemoveCustomPage,
}: ConfigGeneratorHomeProps) {
  const [showS3FetchBar, setShowS3FetchBar] = useState(false);
  const [s3InputUrl, setS3InputUrl] = useState(SAMPLE_S3_URL);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [newCustomName, setNewCustomName] = useState("");

  const handleCreateSubmit = () => {
    if (newCustomName.trim()) {
      onCreateCustomPage(newCustomName.trim());
      setNewCustomName("");
      setShowCustomModal(false);
    }
  };

  return (
    <div className="sg-wrapper">
      <div className="sg-home-card title-gb">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h5>Config Generator Home</h5>
            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#64748B" }}>
              Active Template: <strong>{config.seo?.title || config.template}</strong> (Account ID: {config.accountID || tenantUid})
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              variant={isDetachedOpen ? "primary" : "secondary"}
              size="sm"
              onClick={onOpenDetachedPreview}
            >
              ↗️ {isDetachedOpen ? "Focus Detached Window" : "Detached Live Show"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowS3FetchBar(!showS3FetchBar)}>
              ⚡ Fetch S3 URL
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onFetchFromS3(SAMPLE_S3_URL)}
              disabled={fetchingS3}
            >
              📥 {fetchingS3 ? "Loading S3..." : "Load Sample (154843/site_template.gz)"}
            </Button>
          </div>
        </div>
      </div>

      {showS3FetchBar && (
        <div className="sg-header-card" style={{ background: "#F0F9FF", borderColor: "#BAE6FD" }}>
          <h6 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700, color: "#0369A1" }}>
            Fetch Remote S3 site_template.gz Package
          </h6>
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              value={s3InputUrl}
              onChange={(e) => setS3InputUrl(e.target.value)}
              placeholder="https://bucket.s3.region.amazonaws.com/tenant/site_template.gz"
              fullWidth
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => onFetchFromS3(s3InputUrl)}
              disabled={fetchingS3 || !s3InputUrl}
            >
              {fetchingS3 ? "Fetching..." : "Fetch & Decompress"}
            </Button>
          </div>
        </div>
      )}

      <div className="sg-grid-container">
        {DEFAULT_SECTIONS.map((sec) => (
          <div key={sec.name} className="sg-card" onClick={() => onSelectPath(sec.name)}>
            <div className="sg-card-icon">{sec.icon}</div>
            <h3 className="sg-card-title">{sec.displayName}</h3>
          </div>
        ))}

        {config.customMenuKeys.map((sec) => (
          <div key={sec.name} className="sg-card sg-card--custom" onClick={() => onSelectPath(sec.name)}>
            <button
              type="button"
              className="sg-card-menu-btn"
              onClick={(e) => onRemoveCustomPage(sec.name, e)}
              title="Remove Custom Page"
            >
              🗑️
            </button>
            <div className="sg-card-icon">{sec.icon}</div>
            <h3 className="sg-card-title">{sec.displayName}</h3>
          </div>
        ))}

        <div className="sg-card sg-card--create" onClick={() => setShowCustomModal(true)}>
          <div className="sg-card-icon">+</div>
          <h3 className="sg-card-title">Create Page</h3>
        </div>
      </div>

      {showCustomModal && (
        <div className="sg-modal-overlay">
          <div className="sg-modal-backdrop" onClick={() => setShowCustomModal(false)} />
          <div className="sg-modal-content">
            <h5>Create Custom Page</h5>
            <p>Enter a name to generate the section and add it to the header menu.</p>
            <Input
              value={newCustomName}
              onChange={(e) => setNewCustomName(e.target.value)}
              placeholder="Page name (e.g. Services, Portfolio)"
              fullWidth
            />
            <div className="sg-modal-actions">
              <Button variant="secondary" size="sm" onClick={() => setShowCustomModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateSubmit}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
