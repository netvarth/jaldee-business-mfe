import React from "react";
import { Button, Input, Select, Switch, Textarea } from "@jaldee/design-system";
import {
  SectionConfig,
  SiteConfig,
  SECTION_LAYOUT_TYPES,
  ASPECT_RATIO_PRESETS,
} from "./siteGeneratorTypes";

export interface SectionConfigEditorProps {
  config: SiteConfig;
  openSectionIdx: number | null;
  currentActiveLabel: string;
  isDetachedOpen: boolean;
  onOpenDetachedPreview: () => void;
  onSaveConfiguration: () => void;
  onExportJSON?: () => void;
  onAddSection: () => void;
  onRemoveSection: (idx: number, e: React.MouseEvent) => void;
  onMoveSectionUp?: (idx: number, e: React.MouseEvent) => void;
  onMoveSectionDown?: (idx: number, e: React.MouseEvent) => void;
  onToggleSectionIdx: (idx: number) => void;
  onChangeConfig: React.Dispatch<React.SetStateAction<SiteConfig>>;
  onBackToHome: () => void;
}

export function SectionConfigEditor({
  config,
  openSectionIdx,
  currentActiveLabel,
  isDetachedOpen,
  onOpenDetachedPreview,
  onSaveConfiguration,
  onExportJSON,
  onAddSection,
  onRemoveSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onToggleSectionIdx,
  onChangeConfig,
  onBackToHome,
}: SectionConfigEditorProps) {
  return (
    <div className="sg-wrapper">
      <div className="sg-header-card">
        <div className="sg-header-title-row">
          <h5>
            <span className="sg-back-arrow" onClick={onBackToHome} title="Back to Home">
              ←
            </span>
            &nbsp;&nbsp;{currentActiveLabel} Configuration
          </h5>
          <div className="sg-header-actions">
            {onExportJSON && (
              <Button variant="secondary" size="sm" onClick={onExportJSON}>
                📥 Export JSON
              </Button>
            )}
            <Button
              variant={isDetachedOpen ? "primary" : "secondary"}
              size="sm"
              onClick={onOpenDetachedPreview}
            >
              ↗️ {isDetachedOpen ? "Focus Detached Window" : "Detached Live Show"}
            </Button>
            <Button variant="primary" size="sm" onClick={onSaveConfiguration}>
              💾 Save Configuration
            </Button>
          </div>
        </div>
      </div>

      <div className="sg-editor-body">
        <div className="sg-section-card">
          <div className="sg-section-header" style={{ cursor: "default" }}>
            <span>Section Configuration & Layout Items</span>
            <Button variant="primary" size="sm" onClick={onAddSection}>
              + Add Section
            </Button>
          </div>

          <div className="sg-section-body" style={{ display: "block" }}>
            {config.sections.map((sec, idx) => (
              <div key={sec.id} className="sg-section-card" style={{ marginBottom: 16 }}>
                <div className="sg-section-header" onClick={() => onToggleSectionIdx(idx)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span>
                      Section {idx + 1}: {sec.id} - {sec.title || "Untitled"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
                      <Switch
                        checked={sec.visible !== false}
                        onChange={(checked) => {
                          const newSecs = [...config.sections];
                          newSecs[idx].visible = checked;
                          onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: sec.visible !== false ? "#16a34a" : "#94a3b8" }}>
                        {sec.visible !== false ? "Visible" : "Hidden"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="sg-icon-action-btn"
                      onClick={(e) => onMoveSectionUp?.(idx, e)}
                      disabled={idx === 0}
                      title="Move section up"
                    >
                      ⬆️
                    </button>
                    <button
                      type="button"
                      className="sg-icon-action-btn"
                      onClick={(e) => onMoveSectionDown?.(idx, e)}
                      disabled={idx === config.sections.length - 1}
                      title="Move section down"
                    >
                      ⬇️
                    </button>
                    <button type="button" className="sg-btn-danger" onClick={(e) => onRemoveSection(idx, e)}>
                      🗑️
                    </button>
                  </div>
                </div>

                {openSectionIdx === idx && (
                  <div className="sg-section-body">
                    <div className="settings-form-grid settings-form-grid--two">
                      <Input
                        label="Section ID"
                        value={sec.id}
                        onChange={(e) => {
                          const newSecs = [...config.sections];
                          newSecs[idx].id = e.target.value;
                          onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                        }}
                      />
                      <Select
                        label="Section Layout"
                        value={sec.layout}
                        onChange={(e) => {
                          const newSecs = [...config.sections];
                          newSecs[idx].layout = e.target.value;
                          onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                        }}
                        options={SECTION_LAYOUT_TYPES}
                      />
                      <Input
                        label="Section Title"
                        value={sec.title}
                        onChange={(e) => {
                          const newSecs = [...config.sections];
                          newSecs[idx].title = e.target.value;
                          onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                        }}
                      />
                      <Select
                        label="Aspect Ratio"
                        value={sec.aspectRatio || "16:9"}
                        onChange={(e) => {
                          const newSecs = [...config.sections];
                          newSecs[idx].aspectRatio = e.target.value;
                          onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                        }}
                        options={ASPECT_RATIO_PRESETS}
                      />
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <h5>Content Items ({sec.content.length})</h5>
                      {sec.content.map((cItem, cIdx) => (
                        <div key={cItem.id} className="sg-content-box">
                          <div className="settings-form-grid settings-form-grid--two">
                            <Input
                              label={`Item #${cIdx + 1} Title`}
                              value={cItem.title}
                              onChange={(e) => {
                                const newSecs = [...config.sections];
                                newSecs[idx].content[cIdx].title = e.target.value;
                                onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                              }}
                            />
                            <Input
                              label="Image URL"
                              value={cItem.image}
                              onChange={(e) => {
                                const newSecs = [...config.sections];
                                newSecs[idx].content[cIdx].image = e.target.value;
                                onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                              }}
                            />
                          </div>
                          <Textarea
                            label="Description"
                            value={cItem.description}
                            rows={2}
                            onChange={(e) => {
                              const newSecs = [...config.sections];
                              newSecs[idx].content[cIdx].description = e.target.value;
                              onChangeConfig((prev) => ({ ...prev, sections: newSecs }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
