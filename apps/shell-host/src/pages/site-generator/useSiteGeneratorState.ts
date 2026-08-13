import { useState, useEffect, useRef } from "react";
import { eventBus } from "../../eventBus/eventBus";
import { SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { apiClient } from "@jaldee/api-client";
import {
  CustomPageItem,
  SectionConfig,
  SiteConfig,
  SAMPLE_S3_URL,
  DEFAULT_SECTIONS,
  RARE_CONCEPT_SAMPLE,
  FooterState,
} from "./siteGeneratorTypes";
import { HeaderExtrasState, DEFAULT_HEADER_EXTRAS } from "./HeaderExtrasModal";
import { generatePreviewHTML } from "./previewUtils";
import type { FooterSocialData } from "./FooterSocialModal";

interface SiteGeneratorUploadIdentity {
  userId: string;
  userName: string;
  ownerName: string;
}

export function useSiteGeneratorState(tenantUid: string, uploadIdentity: SiteGeneratorUploadIdentity) {
  const [activePath, setActivePath] = useState<string>("home");
  const [config, setConfig] = useState<SiteConfig>(RARE_CONCEPT_SAMPLE);
  const [openSectionIdx, setOpenSectionIdx] = useState<number | null>(0);

  // Header Customizer State
  const [menuItems, setMenuItems] = useState([
    { title: "Shop", link: "shop" },
    { title: "Travel Packs", link: "travel-packs" },
    { title: "Our Story", link: "our-story" },
    { title: "What We Don't Do", link: "what-we-dont-do" },
    { title: "Contact Us", link: "contact" },
    { title: "Gifting", link: "gifting" },
  ]);

  const [loggedInMenuItems, setLoggedInMenuItems] = useState([
    { title: "Dashboard", link: "dashboard" },
    { title: "My Account", link: "my-account" },
    { title: "Logout", link: "logout" },
  ]);

  const [announcements, setAnnouncements] = useState([
    "Free Shipping on Orders Worth ₹500/-",
    "We Ship Pan India",
  ]);

  // Header Extras State
  const [headerExtrasState, setHeaderExtrasState] = useState<HeaderExtrasState>(DEFAULT_HEADER_EXTRAS);

  // Footer Customizer State
  const [footerState, setFooterState] = useState<FooterState>({
    visible: true,
    variant: "Fashion 4 Column",
    title: "Experience the Essence of Nature with Us!",
    copyright: "© 2026 Rare Concept. All Rights Reserved.",
    brandName: "The Rare Concept",
    showDivider: true,
    addressLine1: "123 Organic Way, Valley Road",
    addressLine2: "Himalayan Foothills, HP 176001",
    description: "Proven by Skin. Loved by Nature.",
    logoAspectRatio: "None",
    footerLogo: "https://jaldeeui.s3.ap-south-1.amazonaws.com/130511/site_assets/rare%20new%20logo.webp",
    foregroundColor: "#FFFFFF",
    backgroundColor: "#1C1917",
  });

  const [footerMenuItems, setFooterMenuItems] = useState<string[]>([]);
  const [footerSocialMedia, setFooterSocialMedia] = useState<FooterSocialData[]>([{
    platform: "instagram",
    url: "",
    icon: "fa-instagram",
    iconUrl: "",
    visible: true,
  }]);
  const [footerColumns, setFooterColumns] = useState<string[]>(["Quick Links", "Policies", "Best Sellers"]);

  const [fetchingS3, setFetchingS3] = useState(false);
  const detachedWindowRef = useRef<Window | null>(null);
  const [isDetachedOpen, setIsDetachedOpen] = useState(false);

  // Synchronize config updates to detached window in real-time
  useEffect(() => {
    if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
      try {
        const doc = detachedWindowRef.current.document;
        doc.open();
        doc.write(generatePreviewHTML(config));
        doc.close();
      } catch (err) {
        console.warn("Could not sync with detached preview window:", err);
      }
    }
  }, [config]);

  const handleOpenDetachedPreview = () => {
    if (detachedWindowRef.current && !detachedWindowRef.current.closed) {
      detachedWindowRef.current.focus();
      return;
    }

    const win = window.open("", "DetachedSitePreview", "width=1280,height=850,resizable=yes,scrollbars=yes");
    if (win) {
      win.document.open();
      win.document.write(generatePreviewHTML(config));
      win.document.close();
      detachedWindowRef.current = win;
      setIsDetachedOpen(true);

      const checkTimer = setInterval(() => {
        if (win.closed) {
          clearInterval(checkTimer);
          setIsDetachedOpen(false);
          detachedWindowRef.current = null;
        }
      }, 1000);

      eventBus.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Detached Live Show Opened",
        message: "Pop-out preview window launched! Changes will synchronize in real-time.",
      });
    }
  };

  const handleFetchFromS3 = async (targetUrl?: string) => {
    const fetchUrl = targetUrl || SAMPLE_S3_URL;
    if (!fetchUrl) return;

    setFetchingS3(true);
    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      const blob = await response.blob();
      let decompressedText = "";

      if (fetchUrl.includes(".gz") || blob.type === "application/gzip") {
        try {
          const ds = new DecompressionStream("gzip");
          const decompressedStream = blob.stream().pipeThrough(ds);
          decompressedText = await new Response(decompressedStream).text();
        } catch {
          decompressedText = await blob.text();
        }
      } else {
        decompressedText = await blob.text();
      }

      const jsonParsed = JSON.parse(decompressedText) as SiteConfig;
      setConfig({
        ...RARE_CONCEPT_SAMPLE,
        ...jsonParsed,
        customMenuKeys: jsonParsed.customMenuKeys || [],
        sections: jsonParsed.sections || RARE_CONCEPT_SAMPLE.sections,
      });

      eventBus.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "S3 Template Loaded",
        message: `Successfully loaded sample template (${jsonParsed.seo?.title || "Template"}).`,
      });
    } catch (err) {
      console.error("Failed to load S3 sample:", err);
      eventBus.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "S3 Load Error",
        message: `Failed to fetch S3 template. ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setFetchingS3(false);
    }
  };

  const handleCreateCustomPage = (nameStr: string) => {
    const pageKey = nameStr.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    if (config.customMenuKeys.some((item) => item.name === pageKey)) {
      eventBus.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Error", message: "A custom page with this name already exists." });
      return;
    }

    const newCustomItem: CustomPageItem = {
      name: pageKey,
      displayName: nameStr.charAt(0).toUpperCase() + nameStr.slice(1),
      icon: "📦",
      isCustom: true,
    };

    setConfig((prev) => ({
      ...prev,
      customMenuKeys: [...prev.customMenuKeys, newCustomItem],
    }));

    eventBus.emit(SHELL_TOAST_EVENT, {
      intent: "success",
      title: "Success",
      message: `Custom page "${newCustomItem.displayName}" created successfully.`,
    });
  };

  const handleRemoveCustomPage = (pageKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this section?")) {
      setConfig((prev) => ({
        ...prev,
        customMenuKeys: prev.customMenuKeys.filter((k) => k.name !== pageKey),
      }));
    }
  };

  const handleSaveConfiguration = async () => {
    const fileName = "site_template.gz";
    const filePath = `${tenantUid}/${fileName}`;

    try {
      const jsonBlob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      const compressedStream = jsonBlob.stream().pipeThrough(new CompressionStream("gzip"));
      const compressedBlob = await new Response(compressedStream).blob();
      const file = new Blob([compressedBlob], { type: "application/gzip" });

      const response = await apiClient.post<{ uploadUrl: string }>(
        "/platform-service/v1/api/drive/initiate-custom-upload",
        {
          action: "ADD",
          filePath,
          fileName,
          fileType: file.type,
          fileSize: file.size,
          caption: "Developer settings configuration",
          featureServiceName: "BASE_CRM",
          featureModuleName: "BASE_CRM_CORE",
          owner: tenantUid,
          ownerName: uploadIdentity.ownerName,
          ownerType: "TenantUser",
          sharedType: "secureShare",
          tenantUid,
          uploadedBy: uploadIdentity.userId,
          uploadedByName: uploadIdentity.userName,
        },
        { _skipLocationParam: true },
      );

      const uploadUrl = response.data.uploadUrl;
      if (!uploadUrl) throw new Error("Upload URL was not returned by the server");

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed with HTTP ${uploadResponse.status}`);
      }

      const s3BaseUrl = import.meta.env.VITE_CUSTOM_UPLOAD_S3_BASE_URL?.trim().replace(/\/$/, "");
      const uploadedUrl = s3BaseUrl ? `${s3BaseUrl}/${filePath}` : filePath;
      eventBus.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Configuration Saved",
        message: `${fileName} uploaded successfully to ${uploadedUrl}`,
      });
    } catch (err) {
      console.error("Failed to upload developer settings configuration:", err);
      eventBus.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Configuration Save Failed",
        message: err instanceof Error ? err.message : "Unable to upload the configuration.",
      });
    }
  };

  const handleAddSection = () => {
    const newSec: SectionConfig = {
      id: `sec-${Date.now()}`,
      title: "New Section Title",
      subTitle: "Section description or subtitle",
      layout: "grid",
      aspectRatio: "1:1",
      visible: true,
      content: [
        {
          id: `item-${Date.now()}`,
          title: "New Item Title",
          description: "Item description goes here",
          image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600",
        },
      ],
    };
    setConfig((prev) => ({ ...prev, sections: [...prev.sections, newSec] }));
    setOpenSectionIdx(config.sections.length);
  };

  const handleRemoveSection = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== idx),
    }));
    if (openSectionIdx === idx) setOpenSectionIdx(null);
  };

  const handleMoveSectionUp = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx <= 0) return;
    setConfig((prev) => {
      const nextSecs = [...prev.sections];
      const temp = nextSecs[idx - 1];
      nextSecs[idx - 1] = nextSecs[idx];
      nextSecs[idx] = temp;
      return { ...prev, sections: nextSecs };
    });
    setOpenSectionIdx((prev) => (prev === idx ? idx - 1 : prev === idx - 1 ? idx : prev));
  };

  const handleMoveSectionDown = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx >= config.sections.length - 1) return;
    setConfig((prev) => {
      const nextSecs = [...prev.sections];
      const temp = nextSecs[idx + 1];
      nextSecs[idx + 1] = nextSecs[idx];
      nextSecs[idx] = temp;
      return { ...prev, sections: nextSecs };
    });
    setOpenSectionIdx((prev) => (prev === idx ? idx + 1 : prev === idx + 1 ? idx : prev));
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site_config_${tenantUid}.json`;
    a.click();
    URL.revokeObjectURL(url);
    eventBus.emit(SHELL_TOAST_EVENT, {
      intent: "success",
      title: "Config Exported",
      message: `Downloaded site_config_${tenantUid}.json successfully.`,
    });
  };

  const currentActiveLabel =
    DEFAULT_SECTIONS.find((s) => s.name === activePath)?.displayName ||
    config.customMenuKeys.find((k) => k.name === activePath)?.displayName ||
    "Page Configuration";

  return {
    activePath,
    setActivePath,
    config,
    setConfig,
    openSectionIdx,
    setOpenSectionIdx,
    menuItems,
    setMenuItems,
    loggedInMenuItems,
    setLoggedInMenuItems,
    announcements,
    setAnnouncements,
    headerExtrasState,
    setHeaderExtrasState,
    footerState,
    setFooterState,
    footerMenuItems,
    setFooterMenuItems,
    footerSocialMedia,
    setFooterSocialMedia,
    footerColumns,
    setFooterColumns,
    fetchingS3,
    isDetachedOpen,
    handleOpenDetachedPreview,
    handleFetchFromS3,
    handleCreateCustomPage,
    handleRemoveCustomPage,
    handleSaveConfiguration,
    handleAddSection,
    handleRemoveSection,
    handleMoveSectionUp,
    handleMoveSectionDown,
    handleExportJSON,
    currentActiveLabel,
  };
}
