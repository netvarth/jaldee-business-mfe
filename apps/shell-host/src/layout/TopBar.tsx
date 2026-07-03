import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Drawer } from "@jaldee/design-system";
import { apiClient } from "@jaldee/api-client";
import { useAuth } from "../auth/useAuth";
import { eventBus } from "../eventBus/eventBus";
import { buildBaseServiceUrl, BASE_SERVICE_ENDPOINTS } from "../services/serviceUrls";
import { useShellStore } from "../store/shellStore";

const USER_PROFILE_UPDATED_EVENT = "jaldee:user-profile-updated";

interface TopBarProps {
  showMenuToggle?: boolean;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
}

export default function TopBar({
  showMenuToggle = false,
  menuOpen = false,
  onMenuToggle,
}: TopBarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const activeLocation = useShellStore((s) => s.activeLocation);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [resolvedUserName, setResolvedUserName] = useState(user?.name ?? "");
  const [resolvedUserEmail, setResolvedUserEmail] = useState(user?.email?.trim() ?? "");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hasFetchedTenantUserDetailRef = useRef(false);
  const tenantUserDetailRequestInFlightRef = useRef(false);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    return eventBus.on(
      USER_PROFILE_UPDATED_EVENT,
      (payload: { userId?: string; fullName?: string; firstName?: string; lastName?: string; email?: string }) => {
        if (payload.userId && payload.userId !== user?.id) {
          return;
        }

        const fullName =
          payload.fullName?.trim() ||
          `${payload.firstName?.trim() || ""} ${payload.lastName?.trim() || ""}`.trim();
        if (fullName) {
          setResolvedUserName(fullName);
        }

        const email = payload.email?.trim();
        if (email) {
          setResolvedUserEmail(email);
        }
      }
    );
  }, [user?.id]);

  useEffect(() => {
    setResolvedUserName(user?.name ?? "");
    setResolvedUserEmail(user?.email?.trim() ?? "");
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (!user?.id) {
      hasFetchedTenantUserDetailRef.current = false;
      tenantUserDetailRequestInFlightRef.current = false;
      return;
    }

    if (hasFetchedTenantUserDetailRef.current || tenantUserDetailRequestInFlightRef.current) {
      return;
    }

    let active = true;
    tenantUserDetailRequestInFlightRef.current = true;

    async function loadTenantUserDetail() {
      try {
        const response = await apiClient.get<Record<string, unknown>>(
          buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantUsers.detail(user.id))
        );
        if (!active) return;

        const detail = response.data ?? {};
        const firstName = typeof detail.firstName === "string" ? detail.firstName.trim() : "";
        const lastName = typeof detail.lastName === "string" ? detail.lastName.trim() : "";
        const fullName = `${firstName} ${lastName}`.trim();
        const fetchedName =
          fullName ||
          (typeof detail.name === "string" ? detail.name.trim() : "") ||
          (typeof detail.userName === "string" ? detail.userName.trim() : "") ||
          user.name;
        const fetchedEmailCandidates = [
          typeof detail.email === "string" ? detail.email.trim() : "",
          typeof detail.primaryEmail === "string" ? detail.primaryEmail.trim() : "",
          typeof detail.emailId === "string" ? detail.emailId.trim() : "",
          user.email?.trim() ?? "",
        ];
        const fetchedEmail = fetchedEmailCandidates.find((value) => value.includes("@")) || "";

        setResolvedUserName(fetchedName);
        setResolvedUserEmail(fetchedEmail);
        hasFetchedTenantUserDetailRef.current = true;
      } catch {
        if (!active) return;
        setResolvedUserName(user.name);
        setResolvedUserEmail(user.email?.trim() ?? "");
      } finally {
        tenantUserDetailRequestInFlightRef.current = false;
      }
    }

    loadTenantUserDetail();

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!user || !account) return null;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsDrawerOpen(false);
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <div data-testid="topbar" className="topbar">
        {showMenuToggle ? (
          <button
            type="button"
            data-testid="topbar-menu-toggle"
            className="topbar-menu-toggle"
            onClick={onMenuToggle}
            title={menuOpen ? "Hide submenu" : "Show submenu"}
            aria-label={menuOpen ? "Hide submenu" : "Show submenu"}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        ) : null}

        <div className="topbar-spacer" />

        <button
          type="button"
          data-testid="topbar-search-toggle"
          className="topbar-search-toggle"
          aria-label="Open search"
          aria-expanded={isSearchOpen}
          onClick={() => setIsSearchOpen(true)}
        >
          {"\u{1F50D}"}
        </button>

        <div
          data-testid="topbar-search-wrapper"
          className="topbar-search-wrapper"
          data-open={isSearchOpen}
        >
          <span className="topbar-search-icon">{"\u{1F50D}"}</span>
          <input
            ref={searchInputRef}
            data-testid="topbar-search"
            placeholder="Search anything..."
            className="topbar-search"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsSearchOpen(false);
              }
            }}
          />
          <button
            type="button"
            className="topbar-search-close"
            aria-label="Close search"
            onClick={() => setIsSearchOpen(false)}
          >
            x
          </button>
        </div>

        <div className="shell-divider" />

        <TopBarIcon id="topbar-inbox" icon={"\u{1F4AC}"} title="Inbox" onClick={() => {}} />
        <TopBarIcon id="topbar-ivr" icon={"\u{1F4DE}"} title="IVR" onClick={() => navigate("/ivr")} />

        <div className="topbar-notification">
          <TopBarIcon
            id="topbar-notifications"
            icon={"\u{1F514}"}
            title="Notifications"
            onClick={() => {}}
          />
          <span className="topbar-notification-dot" />
        </div>

        <TopBarIcon id="topbar-apps" icon={"\u229E"} title="Apps" onClick={() => {}} />

        <div className="shell-divider" />

        <button
          type="button"
          data-testid="topbar-user-menu"
          className="topbar-user-menu"
          onClick={() => setIsDrawerOpen(true)}
          title="Open account menu"
        >
          <div data-testid="topbar-user-avatar" className="topbar-user-avatar">
            {resolvedUserName.charAt(0).toUpperCase()}
          </div>

          <div className="topbar-user-meta">
            <div data-testid="topbar-user-name" className="topbar-user-role">
              ADMIN
            </div>
            <div data-testid="topbar-user-fullname" className="topbar-user-name">
              {resolvedUserName}
            </div>
          </div>

          <span className="topbar-chevron">{"\u25BE"}</span>
        </button>
      </div>

      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        size="sm"
        hideHeader
        panelClassName="account-drawer-panel"
        overlayClassName="account-drawer-overlay"
        contentClassName="account-drawer-content"
      >
        <div className="account-drawer">
          <button
            type="button"
            className="account-drawer-close"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close account drawer"
          >
            x
          </button>

          <div className="account-drawer-hero">
            <div className="account-drawer-avatar">
              {account.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="account-drawer-title">{account.name}</h2>
            {activeLocation && (
              <div className="account-drawer-chip">{activeLocation.name}</div>
            )}
          </div>

          <div className="account-drawer-card">
            <div className="account-drawer-card-avatar">
              {resolvedUserName.charAt(0).toUpperCase()}
            </div>
            <div className="account-drawer-card-meta">
              <div className="account-drawer-card-title">{resolvedUserName}</div>
              {resolvedUserEmail ? <div className="account-drawer-card-subtitle">{resolvedUserEmail}</div> : null}
            </div>
          </div>

          <div className="account-drawer-actions">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setIsDrawerOpen(false)}
              className="account-drawer-action"
            >
              Close
            </Button>
            <Button
              type="button"
              variant="danger"
              size="lg"
              loading={isLoggingOut}
              onClick={handleLogout}
              className="account-drawer-action"
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

interface TopBarIconProps {
  id: string;
  icon: string;
  title: string;
  onClick: () => void;
}

function TopBarIcon({ id, icon, title, onClick }: TopBarIconProps) {
  return (
    <button
      type="button"
      id={id}
      data-testid={id}
      title={title}
      onClick={onClick}
      className="topbar-icon"
    >
      {icon}
    </button>
  );
}
