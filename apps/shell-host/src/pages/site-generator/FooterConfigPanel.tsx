import React from "react";
import type { FooterSocialData } from "./FooterSocialModal";

export interface FooterConfigPanelProps {
  footerMenuItems: string[];
  footerSocialMedia: FooterSocialData[];
  footerColumns: string[];
  onOpenFooterLayoutModal: () => void;
  onOpenFooterColorsModal: () => void;
  onAddFooterMenuItem: () => void;
  onDeleteFooterMenuItem: (idx: number) => void;
  onAddFooterSocial: () => void;
  onEditFooterSocial: (idx: number) => void;
  onDeleteFooterSocial: (idx: number) => void;
  onAddFooterColumn: () => void;
  onEditFooterColumn: (idx: number) => void;
  onDeleteFooterColumn: (idx: number) => void;
}

export function FooterConfigPanel({
  footerMenuItems,
  footerSocialMedia,
  footerColumns,
  onOpenFooterLayoutModal,
  onOpenFooterColorsModal,
  onAddFooterMenuItem,
  onDeleteFooterMenuItem,
  onAddFooterSocial,
  onEditFooterSocial,
  onDeleteFooterSocial,
  onAddFooterColumn,
  onEditFooterColumn,
  onDeleteFooterColumn,
}: FooterConfigPanelProps) {
  return (
    <div className="sg-header-config-wrapper">
      {/* Set Footer Layout */}
      <div className="sg-config-group-card" onClick={onOpenFooterLayoutModal}>
        <div className="sg-config-group-item">
          <div className="sg-config-group-icon">📖</div>
          <div className="sg-config-group-info">
            <h6>Set Footer Layout</h6>
            <p>Background, columns, contact info</p>
          </div>
        </div>
      </div>

      {/* Footer Colors */}
      <div className="sg-config-group-card" onClick={onOpenFooterColorsModal}>
        <div className="sg-config-group-item">
          <div className="sg-config-group-icon">🖌️</div>
          <div className="sg-config-group-info">
            <h6>Footer Colors</h6>
            <p>Update footer colors and typography</p>
          </div>
        </div>
      </div>

      {/* MENU ITEMS SECTION */}
      <div className="sg-header-section-block">
        <h6 className="sg-section-block-title">MENU ITEMS</h6>
        <div className="sg-item-list">
          {footerMenuItems.map((item, idx) => (
            <div key={`f-item-${idx}`} className="sg-item-row">
              <span className="sg-item-row-title">{item}</span>
              <div className="sg-item-row-actions">
                <button
                  type="button"
                  className="sg-icon-action-btn sg-icon-action-btn--delete"
                  onClick={() => onDeleteFooterMenuItem(idx)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          <div className="sg-add-item-card" onClick={onAddFooterMenuItem}>
            <span className="sg-add-item-icon">+</span>
            <div className="sg-add-item-info">
              <h6>Add Menu Item</h6>
              <p>Add buttons or links to the footer.</p>
            </div>
          </div>
        </div>
      </div>

      {/* SOCIAL MEDIA SECTION */}
      <div className="sg-header-section-block">
        <h6 className="sg-section-block-title">SOCIAL MEDIA</h6>
        <div className="sg-item-list">
          {footerSocialMedia.map((social, idx) => (
            <div key={`soc-${idx}`} className="sg-item-row">
              <span className="sg-item-row-title">{social.platform}</span>
              <div className="sg-item-row-actions">
                <button
                  type="button"
                  className="sg-icon-action-btn"
                  onClick={() => onEditFooterSocial(idx)}
                >
                  📝
                </button>
                <button
                  type="button"
                  className="sg-icon-action-btn sg-icon-action-btn--delete"
                  onClick={() => onDeleteFooterSocial(idx)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          <div className="sg-add-item-card" onClick={onAddFooterSocial}>
            <span className="sg-add-item-icon">🌐</span>
            <div className="sg-add-item-info">
              <h6>Add Social Media Item</h6>
              <p>Add and edit social link details.</p>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMNS SECTION */}
      <div className="sg-header-section-block">
        <h6 className="sg-section-block-title">COLUMNS</h6>
        <div className="sg-item-list">
          {footerColumns.map((colName, idx) => (
            <div key={`col-${idx}`} className="sg-item-row">
              <span className="sg-item-row-title">{colName}</span>
              <div className="sg-item-row-actions">
                <button
                  type="button"
                  className="sg-icon-action-btn"
                  onClick={() => onEditFooterColumn(idx)}
                >
                  📝
                </button>
                <button
                  type="button"
                  className="sg-icon-action-btn sg-icon-action-btn--delete"
                  onClick={() => onDeleteFooterColumn(idx)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          <div className="sg-add-item-card" onClick={onAddFooterColumn}>
            <span className="sg-add-item-icon">📖</span>
            <div className="sg-add-item-info">
              <h6>Add Column</h6>
              <p>Add and edit column links.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
