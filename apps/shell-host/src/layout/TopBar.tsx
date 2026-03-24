import { useShellStore } from "../store/shellStore";

export default function TopBar() {
  const user      = useShellStore((s) => s.user);
  const account   = useShellStore((s) => s.account);
  const clearAuth = useShellStore((s) => s.clearAuth);

  if (!user || !account) return null;

  return (
    <div
      data-testid="topbar"
      style={{
        height:       "56px",
        background:   "white",
        borderBottom: "1px solid #E5E7EB",
        display:      "flex",
        alignItems:   "center",
        padding:      "0 20px",
        gap:          "12px",
        position:     "fixed",
        top:          0,
        left:         "72px",
        right:        0,
        zIndex:       99,
      }}
    >

      {/* Account name */}
      <span
        data-testid="topbar-account-name"
        style={{
          fontWeight: 700,
          fontSize:   "15px",
          color:      "#1E1B4B",
          whiteSpace: "nowrap",
        }}
      >
        {account.name}
      </span>

      {/* Spacer — pushes everything to the right */}
      <div style={{ flex: 1 }} />

      {/* Search */}
      <div
        data-testid="topbar-search-wrapper"
        style={{
          position:   "relative",
          width:      "260px",
          flexShrink: 0,
        }}
      >
        <span style={{
          position:      "absolute",
          left:          "10px",
          top:           "50%",
          transform:     "translateY(-50%)",
          color:         "#9CA3AF",
          fontSize:      "13px",
          pointerEvents: "none",
        }}>
          🔍
        </span>
        <input
          data-testid="topbar-search"
          placeholder="Search anything..."
          style={{
            width:        "100%",
            padding:      "7px 12px 7px 30px",
            border:       "1px solid #E5E7EB",
            borderRadius: "8px",
            fontSize:     "13px",
            outline:      "none",
            background:   "#F9FAFB",
            boxSizing:    "border-box",
            color:        "#374151",
          }}
        />
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "20px", background: "#E5E7EB" }} />

      {/* Inbox / Chat */}
      <TopBarIcon
        id="topbar-inbox"
        icon="💬"
        title="Inbox"
        onClick={() => {}}
      />

      {/* IVR / Calls */}
      <TopBarIcon
        id="topbar-ivr"
        icon="📞"
        title="IVR"
        onClick={() => {}}
      />

      {/* Notifications */}
      <div style={{ position: "relative" }}>
        <TopBarIcon
          id="topbar-notifications"
          icon="🔔"
          title="Notifications"
          onClick={() => {}}
        />
        <span style={{
          position:      "absolute",
          top:           "2px",
          right:         "2px",
          width:         "8px",
          height:        "8px",
          background:    "#DC2626",
          borderRadius:  "50%",
          border:        "1.5px solid white",
          pointerEvents: "none",
        }} />
      </div>

      {/* Apps grid */}
      <TopBarIcon
        id="topbar-apps"
        icon="⊞"
        title="Apps"
        onClick={() => {}}
      />

      {/* Divider */}
      <div style={{ width: "1px", height: "20px", background: "#E5E7EB" }} />

      {/* User menu */}
      <div
        data-testid="topbar-user-menu"
        onClick={clearAuth}
        title="Click to logout"
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "8px",
          cursor:       "pointer",
          padding:      "4px 8px 4px 4px",
          borderRadius: "8px",
          border:       "1px solid #E5E7EB",
          flexShrink:   0,
        }}
      >
        {/* Avatar */}
        <div
          data-testid="topbar-user-avatar"
          style={{
            width:          "28px",
            height:         "28px",
            borderRadius:   "50%",
            background:     "#5B21D1",
            color:          "white",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       "12px",
            fontWeight:     700,
            flexShrink:     0,
          }}
        >
          {user.name.charAt(0)}
        </div>

        {/* Name + role */}
        <div>
          <div
            data-testid="topbar-user-name"
            style={{
              fontSize:   "11px",
              fontWeight: 400,
              color:      "#6B7280",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            ADMIN
          </div>
          <div
            data-testid="topbar-user-fullname"
            style={{
              fontSize:   "13px",
              fontWeight: 600,
              color:      "#1E1B4B",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {user.name}
          </div>
        </div>

        {/* Chevron */}
        <span style={{ color: "#9CA3AF", fontSize: "10px" }}>▾</span>
      </div>

    </div>
  );
}

// ─── Reusable top bar icon button ─────────────────────

interface TopBarIconProps {
  id:      string;
  icon:    string;
  title:   string;
  onClick: () => void;
}

function TopBarIcon({ id, icon, title, onClick }: TopBarIconProps) {
  return (
    <button
      id={id}
      data-testid={id}
      title={title}
      onClick={onClick}
      style={{
        background:     "none",
        border:         "none",
        width:          "34px",
        height:         "34px",
        borderRadius:   "8px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         "pointer",
        fontSize:       "17px",
        color:          "#6B7280",
        flexShrink:     0,
        padding:        0,
      }}
    >
      {icon}
    </button>
  );
}