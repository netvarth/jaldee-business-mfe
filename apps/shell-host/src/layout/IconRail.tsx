import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import type { ProductKey } from "../store/shellStore";

const PRODUCT_CONFIG: Record<ProductKey, { label: string; icon: string }> = {
  health: { label: "Health", icon: "\u{1F3E5}" },
  bookings: { label: "Bookings", icon: "\u{1F4C5}" },
  golderp: { label: "Gold ERP", icon: "\u{1F4BC}" },
  karty: { label: "Karty", icon: "\u{1F6D2}" },
  finance: { label: "Finance", icon: "\u{1F4B0}" },
  lending: { label: "Lending", icon: "\u{1F3E6}" },
  hr: { label: "HR", icon: "\u{1F465}" },
  ai: { label: "AI", icon: "\u2728" },
};

const PRODUCT_ORDER: ProductKey[] = [
  "health",
  "bookings",
  "golderp",
  "karty",
  "finance",
  "lending",
  "hr",
  "ai",
];

export default function IconRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const account = useShellStore((s) => s.account);
  const activeProduct = useShellStore((s) => s.activeProduct);
  const setActiveProduct = useShellStore((s) => s.setActiveProduct);

  if (!account) return null;

  useEffect(() => {
    const matchedProduct = account.licensedProducts.find((key) =>
      location.pathname.startsWith(`/${key}`)
    );

    if (matchedProduct) {
      setActiveProduct(matchedProduct);
      return;
    }

    if (location.pathname === "/home" || location.pathname === "/") {
      setActiveProduct(null);
    }
  }, [account.licensedProducts, location.pathname, setActiveProduct]);

  function handleNavigate(key: ProductKey) {
    setActiveProduct(key);
    navigate(`/${key}`);
  }

  function handleHome() {
    setActiveProduct(null);
    navigate("/home");
  }

  const isActive = (key: string) => location.pathname.startsWith(`/${key}`);
  const licensedProducts = PRODUCT_ORDER.filter((key) => account.licensedProducts.includes(key));

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
        {"\u2726"}
      </div>

      <RailItem
        id="icon-rail-item-home"
        product="default"
        icon={"\u{1F3E0}"}
        label="Home"
        active={location.pathname === "/home"}
        onClick={handleHome}
      />

      {licensedProducts.map((key) => {
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
        icon={"\u22EF"}
        label="More"
        active={false}
        onClick={() => {}}
      />

      <RailItem
        id="icon-rail-item-settings"
        product="default"
        icon={"\u2699"}
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
