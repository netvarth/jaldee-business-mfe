import { useNavigate, useLocation } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import type { ProductKey } from "../store/shellStore";

const PRODUCT_CONFIG: Record<ProductKey, { label: string; icon: string }> = {
  health: { label: "Health", icon: "🏥" },
  bookings: { label: "Bookings", icon: "📅" },
  karty: { label: "Karty", icon: "🛒" },
  finance: { label: "Finance", icon: "💰" },
  lending: { label: "Lending", icon: "🏦" },
  hr: { label: "HR", icon: "👥" },
  ai: { label: "AI", icon: "✨" },
};

export default function IconRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const account = useShellStore((s) => s.account);
  const activeProduct = useShellStore((s) => s.activeProduct);
  const setActiveProduct = useShellStore((s) => s.setActiveProduct);

  if (!account) return null;

  function handleNavigate(key: ProductKey) {
    setActiveProduct(key);
    navigate(`/${key}`);
  }

  function handleHome() {
    setActiveProduct(null);
    navigate("/home");
  }

  const isActive = (key: string) => location.pathname.startsWith(`/${key}`);

  return (
    <div
      data-testid="icon-rail"
      className="icon-rail"
      data-product={activeProduct ?? "default"}
    >
      <div
        data-testid="icon-rail-logo"
        className="icon-rail-logo"
        onClick={handleHome}
      >
        ✦
      </div>

      <RailItem
        id="icon-rail-item-home"
        product="default"
        icon="🏠"
        label="Home"
        active={location.pathname === "/home"}
        onClick={handleHome}
      />

      {account.licensedProducts.map((key) => {
        const config = PRODUCT_CONFIG[key];
        if (!config) return null;

        return (
          <RailItem
            key={key}
            id={`icon-rail-item-${key}`}
            product={key}
            icon={config.icon}
            label={config.label}
            active={isActive(key)}
            onClick={() => handleNavigate(key)}
          />
        );
      })}

      <div className="icon-rail-spacer" />

      <RailItem
        id="icon-rail-item-more"
        product="default"
        icon="⋯"
        label="More"
        active={false}
        onClick={() => {}}
      />

      <RailItem
        id="icon-rail-item-settings"
        product="default"
        icon="⚙️"
        label="Settings"
        active={location.pathname.startsWith("/settings")}
        onClick={() => navigate("/settings")}
      />
    </div>
  );
}

interface RailItemProps {
  id: string;
  product: ProductKey | "default";
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function RailItem({ id, product, icon, label, active, onClick }: RailItemProps) {
  return (
    <div
      id={id}
      data-testid={id}
      data-product={product}
      data-active={active}
      onClick={onClick}
      title={label}
      className="icon-rail-item"
    >
      <span className="icon-rail-item-icon">{icon}</span>
      <span className="icon-rail-item-label" data-active={active}>
        {label}
      </span>
    </div>
  );
}
