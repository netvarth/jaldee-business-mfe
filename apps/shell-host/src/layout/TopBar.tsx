import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Drawer } from "@jaldee/design-system";
import { useAuth } from "../auth/useAuth";
import { useShellStore } from "../store/shellStore";

export default function TopBar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const activeLocation = useShellStore((s) => s.activeLocation);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const productSummary = useMemo(() => {
    if (!account?.licensedProducts?.length) return "No products enabled";
    return account.licensedProducts.join(" / ");
  }, [account?.licensedProducts]);

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
        <span data-testid="topbar-account-name" className="topbar-account-name">
          {account.name}
        </span>

        <div className="topbar-spacer" />

        <div data-testid="topbar-search-wrapper" className="topbar-search-wrapper">
          <span className="topbar-search-icon">{"\u{1F50D}"}</span>
          <input
            data-testid="topbar-search"
            placeholder="Search anything..."
            className="topbar-search"
          />
        </div>

        <div className="shell-divider" />

        <TopBarIcon id="topbar-inbox" icon={"\u{1F4AC}"} title="Inbox" onClick={() => {}} />
        <TopBarIcon id="topbar-ivr" icon={"\u{1F4DE}"} title="IVR" onClick={() => {}} />

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
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div className="topbar-user-meta">
            <div data-testid="topbar-user-name" className="topbar-user-role">
              ADMIN
            </div>
            <div data-testid="topbar-user-fullname" className="topbar-user-name">
              {user.name}
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
            <p className="account-drawer-subtitle">{user.name}</p>
            <p className="account-drawer-caption">{productSummary}</p>
            {activeLocation && (
              <div className="account-drawer-chip">{activeLocation.name}</div>
            )}
          </div>

          <div className="account-drawer-card">
            <div className="account-drawer-card-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="account-drawer-card-meta">
              <div className="account-drawer-card-title">{user.name}</div>
              <div className="account-drawer-card-subtitle">{user.email}</div>
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
