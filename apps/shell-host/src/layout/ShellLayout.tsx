import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import IconRail from "./IconRail";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import { useShellStore } from "../store/shellStore";
import "./shell.css";

interface Props {
  children: ReactNode;
}

export default function ShellLayout({ children }: Props) {
  const location = useLocation();
  const sidebarVisible = useShellStore((s) => s.sidebarVisible);
  const setSidebarVisible = useShellStore((s) => s.setSidebarVisible);
  const [collapseSubmenuAfterSelection, setCollapseSubmenuAfterSelection] = useState(false);
  const isSmallScreen = useIsSmallScreen();
  const isSettingsRoute = location.pathname.startsWith("/settings");
  const navigationOpen = isSmallScreen ? sidebarVisible : true;
  const submenuVisible = isSmallScreen ? navigationOpen : sidebarVisible;
  const showSidebarPanel = !isSettingsRoute && submenuVisible;

  useEffect(() => {
    setSidebarVisible(!isSmallScreen);
    setCollapseSubmenuAfterSelection(false);
  }, [isSmallScreen, setSidebarVisible]);

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

      <div data-testid="shell-main" className="shell-main" data-sidebar={submenuVisible}>
        <TopBar
          showMenuToggle
          menuOpen={submenuVisible}
          onMenuToggle={handleMenuToggle}
        />
        <div className="shell-body">
          <div data-testid="shell-content" className="shell-content">
            {children}
          </div>
        </div>
      </div>
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
