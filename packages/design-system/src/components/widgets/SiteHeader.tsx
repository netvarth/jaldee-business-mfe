import React, { useState } from "react";
import { WidgetContent } from "./types";

export interface MenuItem {
  title: string;
  link: string;
  icon?: string;
  submenu?: MenuItem[];
}

export interface SiteHeaderProps {
  variant?: "fashion" | "fashion-inline" | "minimal" | "header1" | "header2" | "header3" | "header4";
  logo?: string;
  title?: string;
  description?: string;
  topTickerText?: string;
  menu?: MenuItem[];
  showSearch?: boolean;
  showWishlist?: boolean;
  showCart?: boolean;
  showLogin?: boolean;
  userName?: string;
  cartCount?: number;
  wishlistCount?: number;
  headerBgColor?: string;
  headerTextColor?: string;
  tickerBgColor?: string;
  tickerTextColor?: string;
  onSearch?: (query: string) => void;
  onNavigate?: (link: string) => void;
  onCartClick?: () => void;
  onWishlistClick?: () => void;
  onLoginClick?: () => void;
}

const DEFAULT_RARE_MENU: MenuItem[] = [
  { title: "Shop", link: "shop" },
  { title: "Our Story", link: "our-story" },
  { title: "What We Don't Do", link: "what-we-dont-do" },
  { title: "Contact Us", link: "contact" },
  { title: "Gifting", link: "gifting" },
];

export function SiteHeader({
  variant = "fashion",
  logo,
  title = "Experience the Essence of Nature with Us!",
  description,
  topTickerText = "Free Shipping on Orders Worth ₹500/-",
  menu = DEFAULT_RARE_MENU,
  showSearch = true,
  showWishlist = false,
  showCart = true,
  showLogin = true,
  userName = "Account",
  cartCount = 0,
  headerBgColor,
  headerTextColor,
  tickerBgColor,
  tickerTextColor,
  onSearch,
  onNavigate,
  onCartClick,
  onLoginClick,
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="widget-site-header">
      {/* Top Ticker Bar */}
      {topTickerText && (
        <div
          className="widget-site-header__ticker"
          style={{
            backgroundColor: tickerBgColor || "#4A0404",
            color: tickerTextColor || "#FFFFFF",
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: topTickerText }} />
        </div>
      )}

      <div
        className="widget-site-header__main-container"
        style={{
          backgroundColor: headerBgColor || "#FFFFFF",
          color: headerTextColor || "#1C1917",
        }}
      >
        {/* Main Header Row */}
        <div className="widget-site-header__top-row">
          <div className="widget-site-header__brand-group" onClick={() => onNavigate?.("home")}>
            {logo ? (
              <img src={logo} alt="Logo" className="widget-site-header__logo" />
            ) : (
              <div className="widget-site-header__logo-fallback">R</div>
            )}
            <h2 className="widget-site-header__main-title" style={{ color: headerTextColor || "#1C1917" }}>
              {title}
            </h2>
          </div>

          <div className="widget-site-header__action-pills">
            {showSearch && (
              <button
                type="button"
                className="widget-site-header__pill-btn"
                onClick={() => onSearch?.("")}
              >
                <span>🔍</span> Search
              </button>
            )}

            {showCart && (
              <button
                type="button"
                className="widget-site-header__pill-btn"
                onClick={onCartClick}
              >
                <span>🛒</span> Cart
                {cartCount > 0 && <span className="widget-site-header__badge">{cartCount}</span>}
              </button>
            )}

            {showLogin && (
              <button
                type="button"
                className="widget-site-header__pill-btn"
                onClick={onLoginClick}
              >
                <span>👤</span> {userName} ▾
              </button>
            )}

            <button
              type="button"
              className="widget-site-header__toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Sub Navigation Pills Row */}
        {menu && menu.length > 0 && (
          <nav className={`widget-site-header__pills-nav ${mobileMenuOpen ? "open" : ""}`}>
            {menu.map((item) => (
              <button
                key={item.link}
                type="button"
                className="widget-site-header__nav-pill"
                onClick={() => {
                  onNavigate?.(item.link);
                  setMobileMenuOpen(false);
                }}
              >
                {item.title}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
