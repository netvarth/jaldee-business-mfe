import { useNavigate, useLocation } from "react-router-dom";
import { useShellStore }            from "../store/shellStore";
import type { ProductKey }          from "../store/shellStore";

const PRODUCT_CONFIG: Record<ProductKey, { label: string; icon: string; accent: string }> = {
  health:   { label: "Health",   icon: "🏥", accent: "#0D9488" },
  bookings: { label: "Bookings", icon: "📅", accent: "#2563EB" },
  karty:    { label: "Karty",    icon: "🛒", accent: "#EA580C" },
  finance:  { label: "Finance",  icon: "💰", accent: "#059669" },
  lending:  { label: "Lending",  icon: "🏦", accent: "#7C3AED" },
  hr:       { label: "HR",       icon: "👥", accent: "#0369A1" },
  ai:       { label: "AI",       icon: "✨", accent: "#6366F1" },
};

export default function IconRail() {
  const navigate         = useNavigate();
  const location         = useLocation();
  const account          = useShellStore((s) => s.account);
  const activeProduct    = useShellStore((s) => s.activeProduct);
  const setActiveProduct = useShellStore((s) => s.setActiveProduct);

  if (!account) return null;

  const activeAccent = activeProduct
    ? PRODUCT_CONFIG[activeProduct].accent
    : "#5B21D1";

  function handleNavigate(key: ProductKey) {
    setActiveProduct(key);
    navigate(`/${key}`);
  }

  function handleHome() {
    setActiveProduct(null);
    navigate("/home");
  }

  const isActive = (key: string) =>
    location.pathname.startsWith(`/${key}`);

  return (
    <div
      data-testid="icon-rail"
      style={{
        width:          "72px",
        height:      "100vh",
        background:     "white",
        borderRight:    "1px solid #E5E7EB",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        paddingTop:     "8px",
        paddingBottom:  "8px",
        gap:            "4px",
        position:       "fixed",
        left:           0,
        top:            0,
        bottom:         0,
        zIndex:         100,
      }}
    >

      {/* Logo */}
      <div
        data-testid="icon-rail-logo"
        onClick={handleHome}
        style={{
          width:          "44px",
          height:         "44px",
          background:     activeAccent,
          borderRadius:   "12px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "20px",
          cursor:         "pointer",
          marginBottom:   "8px",
          transition:     "background 0.2s",
        }}
      >
        ✦
      </div>

      {/* Home */}
      <RailItem
        id="icon-rail-item-home"
        icon="🏠"
        label="Home"
        active={location.pathname === "/home"}
        accent={activeAccent}
        onClick={handleHome}
      />

      {/* Licensed products */}
      {account.licensedProducts.map((key) => {
        const config = PRODUCT_CONFIG[key];
        if (!config) return null;
        return (
          <RailItem
            key={key}
            id={`icon-rail-item-${key}`}
            icon={config.icon}
            label={config.label}
            active={isActive(key)}
            accent={config.accent}
            onClick={() => handleNavigate(key)}
          />
        );
      })}

      <div style={{ flex: 1 }} />

      {/* More */}
      <RailItem
        id="icon-rail-item-more"
        icon="⋯"
        label="More"
        active={false}
        accent={activeAccent}
        onClick={() => {}}
      />

      {/* Settings */}
      <RailItem
        id="icon-rail-item-settings"
        icon="⚙️"
        label="Settings"
        active={location.pathname.startsWith("/settings")}
        accent={activeAccent}
        onClick={() => navigate("/settings")}
      />

    </div>
  );
}

interface RailItemProps {
  id:      string;
  icon:    string;
  label:   string;
  active:  boolean;
  accent:  string;
  onClick: () => void;
}

function RailItem({ id, icon, label, active, accent, onClick }: RailItemProps) {
  return (
    <div
      id={id}
      data-testid={id}
      data-active={active}
      onClick={onClick}
      title={label}
      style={{
        width:          "56px",
        padding:        "8px 4px",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            "4px",
        borderRadius:   "10px",
        cursor:         "pointer",
        background:     active ? `${accent}18` : "transparent",
        transition:     "background 0.15s",
      }}
    >
      <span style={{ fontSize: "20px", lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize:   "10px",
        fontWeight: active ? 600 : 400,
        color:      active ? accent : "#6B7280",
        textAlign:  "center",
        lineHeight: 1.2,
      }}>
        {label}
      </span>
    </div>
  );
}