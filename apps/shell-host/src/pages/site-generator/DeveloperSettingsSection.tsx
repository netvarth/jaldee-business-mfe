import React from "react";
import { ConfigGeneratorHome } from "./ConfigGeneratorHome";
import { WebsiteCustomizerView } from "./WebsiteCustomizerView";
import { SectionConfigEditor } from "./SectionConfigEditor";
import { useSiteGeneratorState } from "./useSiteGeneratorState";

export function DeveloperSettingsSection({
  tenantUid = "tenant-user",
  userId,
  userName,
  ownerName,
}: {
  tenantUid?: string;
  userId?: string;
  userName?: string;
  ownerName?: string;
}) {
  const state = useSiteGeneratorState(tenantUid, {
    userId: userId ?? tenantUid,
    userName: userName ?? ownerName ?? "Tenant User",
    ownerName: ownerName ?? userName ?? "Tenant",
  });

  if (state.activePath === "home") {
    return (
      <ConfigGeneratorHome
        config={state.config}
        tenantUid={tenantUid}
        isDetachedOpen={state.isDetachedOpen}
        fetchingS3={state.fetchingS3}
        onOpenDetachedPreview={state.handleOpenDetachedPreview}
        onFetchFromS3={state.handleFetchFromS3}
        onSelectPath={state.setActivePath}
        onCreateCustomPage={state.handleCreateCustomPage}
        onRemoveCustomPage={state.handleRemoveCustomPage}
      />
    );
  }

  if (state.activePath === "site") {
    return (
      <WebsiteCustomizerView
        config={state.config}
        menuItems={state.menuItems}
        loggedInMenuItems={state.loggedInMenuItems}
        announcements={state.announcements}
        headerExtrasState={state.headerExtrasState}
        footerState={state.footerState}
        footerMenuItems={state.footerMenuItems}
        footerSocialMedia={state.footerSocialMedia}
        footerColumns={state.footerColumns}
        openSectionIdx={state.openSectionIdx}
        isDetachedOpen={state.isDetachedOpen}
        onChangeConfig={state.setConfig}
        onChangeHeaderExtrasState={state.setHeaderExtrasState}
        onChangeFooterState={state.setFooterState}
        onOpenDetachedPreview={state.handleOpenDetachedPreview}
        onSaveConfiguration={state.handleSaveConfiguration}
        onExportJSON={state.handleExportJSON}
        onBackToHome={() => state.setActivePath("home")}
        onAddSection={state.handleAddSection}
        onRemoveSection={state.handleRemoveSection}
        onToggleSectionIdx={(idx) => state.setOpenSectionIdx(state.openSectionIdx === idx ? null : idx)}
        setMenuItems={state.setMenuItems}
        setLoggedInMenuItems={state.setLoggedInMenuItems}
        setAnnouncements={state.setAnnouncements}
        setFooterMenuItems={state.setFooterMenuItems}
        setFooterSocialMedia={state.setFooterSocialMedia}
        setFooterColumns={state.setFooterColumns}
      />
    );
  }

  return (
    <SectionConfigEditor
      config={state.config}
      openSectionIdx={state.openSectionIdx}
      currentActiveLabel={state.currentActiveLabel}
      isDetachedOpen={state.isDetachedOpen}
      onOpenDetachedPreview={state.handleOpenDetachedPreview}
      onSaveConfiguration={state.handleSaveConfiguration}
      onExportJSON={state.handleExportJSON}
      onAddSection={state.handleAddSection}
      onRemoveSection={state.handleRemoveSection}
      onMoveSectionUp={state.handleMoveSectionUp}
      onMoveSectionDown={state.handleMoveSectionDown}
      onToggleSectionIdx={(idx) => state.setOpenSectionIdx(state.openSectionIdx === idx ? null : idx)}
      onChangeConfig={state.setConfig}
      onBackToHome={() => state.setActivePath("home")}
    />
  );
}
