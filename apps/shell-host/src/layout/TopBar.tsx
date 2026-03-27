import { useShellStore } from "../store/shellStore";

export default function TopBar() {
  const user = useShellStore((s) => s.user);
  const account = useShellStore((s) => s.account);
  const clearAuth = useShellStore((s) => s.clearAuth);

  if (!user || !account) return null;

  return (
    <div data-testid="topbar" className="topbar">
      <span data-testid="topbar-account-name" className="topbar-account-name">
        {account.name}
      </span>

      <div className="topbar-spacer" />

      <div data-testid="topbar-search-wrapper" className="topbar-search-wrapper">
        <span className="topbar-search-icon">🔍</span>
        <input
          data-testid="topbar-search"
          placeholder="Search anything..."
          className="topbar-search"
        />
      </div>

      <div className="shell-divider" />

      <TopBarIcon id="topbar-inbox" icon="💬" title="Inbox" onClick={() => {}} />
      <TopBarIcon id="topbar-ivr" icon="📞" title="IVR" onClick={() => {}} />

      <div className="topbar-notification">
        <TopBarIcon id="topbar-notifications" icon="🔔" title="Notifications" onClick={() => {}} />
        <span className="topbar-notification-dot" />
      </div>

      <TopBarIcon id="topbar-apps" icon="⊞" title="Apps" onClick={() => {}} />

      <div className="shell-divider" />

      <div
        data-testid="topbar-user-menu"
        className="topbar-user-menu"
        onClick={clearAuth}
        title="Click to logout"
      >
        <div
          data-testid="topbar-user-avatar"
          className="topbar-user-avatar"
        >
          {user.name.charAt(0)}
        </div>

        <div className="topbar-user-meta">
          <div data-testid="topbar-user-name" className="topbar-user-role">
            ADMIN
          </div>
          <div data-testid="topbar-user-fullname" className="topbar-user-name">
            {user.name}
          </div>
        </div>

        <span className="topbar-chevron">▾</span>
      </div>
    </div>
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
