import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { ProductKey } from "@jaldee/auth-context";
import IconRail from "./IconRail";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import ShellToastHost from "./ShellToastHost";
import { useShellStore } from "../store/shellStore";
import { telemetryService } from "../services/telemetry";
import { themeService } from "../theme/ThemeService";
import "./shell.css";

interface Props {
  children: ReactNode;
}

export default function ShellLayout({ children }: Props) {
  const location = useLocation();
  const sidebarVisible = useShellStore((s) => s.sidebarVisible);
  const setSidebarVisible = useShellStore((s) => s.setSidebarVisible);
  const activeProduct = useShellStore((s) => s.activeProduct);
  const setActiveProduct = useShellStore((s) => s.setActiveProduct);
  const [collapseSubmenuAfterSelection, setCollapseSubmenuAfterSelection] = useState(false);
  const shellContentRef = useRef<HTMLDivElement>(null);
  const isSmallScreen = useIsSmallScreen();
  const isSettingsRoute = location.pathname.startsWith("/settings");
  const navigationOpen = isSmallScreen ? sidebarVisible : true;
  const submenuVisible = isSmallScreen ? navigationOpen : sidebarVisible;
  const showSidebarPanel = !isSettingsRoute && submenuVisible;

  useEffect(() => {
    const path = location.pathname;
    let matchedProduct: ProductKey | null = null;
    if (path.startsWith("/hr")) matchedProduct = "hr";
    else if (path.startsWith("/finance")) matchedProduct = "finance";
    else if (path.startsWith("/bookings")) matchedProduct = "bookings";
    else if (path.startsWith("/health")) matchedProduct = "health";
    else if (path.startsWith("/gold-erp") || path.startsWith("/golderp")) matchedProduct = "golderp";
    else if (path.startsWith("/karty")) matchedProduct = "karty";
    else if (path.startsWith("/lending")) matchedProduct = "lending";

    if (matchedProduct) {
      setActiveProduct(matchedProduct);
      themeService.applyProductAccent(matchedProduct);
    } else {
      themeService.clearProductAccent();
    }
  }, [location.pathname, setActiveProduct]);

  useEffect(() => {
    setSidebarVisible(!isSmallScreen);
    setCollapseSubmenuAfterSelection(false);
  }, [isSmallScreen, setSidebarVisible]);

  useEffect(() => {
    telemetryService.trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  useLayoutEffect(() => {
    if (!location.pathname.startsWith("/finance")) return;
    const shellContent = shellContentRef.current;
    if (!shellContent) return;

    // The Booking calendar temporarily owns these inline styles for its
    // full-height grid. Clear any leaked values before Finance is painted so
    // the shell's normal vertical scrolling is restored.
    shellContent.style.removeProperty("overflow-y");
    shellContent.style.removeProperty("overflow-x");
    shellContent.style.removeProperty("display");
    shellContent.scrollTop = 0;
  }, [location.pathname]);

  function handleMenuToggle() {
    setCollapseSubmenuAfterSelection(false);
    setSidebarVisible(!sidebarVisible);
  }

  function handleRailNavigation() {
    if (!isSmallScreen && !submenuVisible) {
      setCollapseSubmenuAfterSelection(true);
    }
  }

  function handleSubmenuSelection() {
    setCollapseSubmenuAfterSelection(false);
  }

  return (
    <div
      data-testid="shell-layout"
      className="shell-layout"
      data-mobile-menu-open={isSmallScreen && navigationOpen}
    >
      {isSmallScreen && navigationOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarVisible(false)}
        />
      ) : null}

      {navigationOpen ? (
        <div className="shell-navigation" data-has-sidebar={submenuVisible}>
          <IconRail
            submenuVisible={submenuVisible}
            collapseOnSelect={collapseSubmenuAfterSelection}
            onRailNavigate={handleRailNavigation}
            onSubmenuSelection={handleSubmenuSelection}
          />
          {showSidebarPanel ? (
            <Sidebar
              collapseOnSelect={collapseSubmenuAfterSelection}
              onSubmenuSelection={handleSubmenuSelection}
            />
          ) : null}
        </div>
      ) : null}

      <div
        data-testid="shell-main"
        className="shell-main"
        data-sidebar={submenuVisible}
      >
        <TopBar
          showMenuToggle
          menuOpen={submenuVisible}
          onMenuToggle={handleMenuToggle}
        />
        <div className="shell-body">
          <div ref={shellContentRef} data-testid="shell-content" className="shell-content">
            {children}
          </div>
        </div>
      </div>
      <ShellToastHost />
    </div>
  );
}

function useIsSmallScreen() {
  const [isSmall, setIsSmall] = useState(() => window.innerWidth <= 1024);

  useEffect(() => {
    function handleResize() {
      setIsSmall(window.innerWidth <= 1024);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isSmall;
}
