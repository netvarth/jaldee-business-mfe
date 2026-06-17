import { hexToHSL } from "./colorUtils";
import type {
  AccountTheme,
  UserPreferences,
  ProductKey,
  WhiteLabelConfig,
} from "@jaldee/auth-context";

interface ProductAccent {
  primary: string;
  name: string;
}

const PRODUCT_ACCENTS: Record<ProductKey, ProductAccent> = {
  health: {
    primary: "#0D9488",
    name: "Teal",
  },
  bookings: {
    primary: "#2563EB",
    name: "Blue",
  },
  golderp: {
    primary: "#B45309",
    name: "Gold",
  },
  karty: {
    primary: "#EA580C",
    name: "Orange",
  },
  finance: {
    primary: "#059669",
    name: "Green",
  },
  lending: {
    primary: "#7C3AED",
    name: "Purple",
  },
  hr: {
    primary: "#115E59",
    name: "Teal",
  },
  ai: {
    primary: "#6366F1",
    name: "Indigo",
  },
};

class ThemeService {
  private currentAccountTheme: AccountTheme | null = null;
  private currentProductKey: ProductKey | null = null;
  accountLogoUrl: string | null = null;
  accountFaviconUrl: string | null = null;

  // Called at login — Layer 2
  applyAccountTheme(theme: AccountTheme) {
    this.currentAccountTheme = theme;
    this.injectPrimaryTokens(theme.primaryColor);
    this.accountLogoUrl = theme.logoUrl;
    this.accountFaviconUrl = theme.faviconUrl ?? null;
    if (theme.faviconUrl) {
      this.applyFavicon(theme.faviconUrl);
    }
  }

  // Called on product navigation — Layer 3
  applyProductAccent(productKey: ProductKey) {
    this.currentProductKey = productKey;
    const accent = PRODUCT_ACCENTS[productKey];
    if (accent) {
      this.injectPrimaryTokens(accent.primary);
      document.documentElement.setAttribute("data-product", productKey);
    }
  }

  // Called when leaving a product — restore Layer 2
  clearProductAccent() {
    this.currentProductKey = null;
    if (this.currentAccountTheme) {
      this.injectPrimaryTokens(this.currentAccountTheme.primaryColor);
    }
    document.documentElement.removeAttribute("data-product");
  }

  // Called at login — Layer 4
  applyUserPreferences(prefs: UserPreferences) {
    const prefersDark =
      prefs.theme === "dark" ||
      (prefs.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.setAttribute(
      "data-theme",
      prefersDark ? "dark" : "light"
    );

    const fontSizeMap = { sm: "13px", md: "14px", lg: "15px" };
    document.documentElement.style.setProperty(
      "--text-base",
      fontSizeMap[prefs.fontSize]
    );
  }

  // Enterprise White Label Config
  applyWhiteLabel(config: WhiteLabelConfig) {
    const root = document.documentElement;
    if (config.hideJaldeeBranding) {
      root.setAttribute("data-white-label", "true");
    } else {
      root.removeAttribute("data-white-label");
    }

    const existingStyle = document.getElementById("jaldee-white-label-css");
    if (existingStyle) {
      existingStyle.remove();
    }
    if (config.customCss) {
      const style = document.createElement("style");
      style.id = "jaldee-white-label-css";
      style.innerHTML = config.customCss;
      document.head.appendChild(style);
    }
  }

  clearWhiteLabel() {
    document.documentElement.removeAttribute("data-white-label");
    const existingStyle = document.getElementById("jaldee-white-label-css");
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  // Called on logout — full reset to Layer 1
  reset() {
    this.clearAccountTheme();
    this.clearWhiteLabel();
    this.currentProductKey = null;
    this.accountLogoUrl = null;
    this.accountFaviconUrl = null;
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-product");
  }

  // ─── Private helpers ───────────────────────────
  private injectPrimaryTokens(hex: string) {
    const root = document.documentElement;
    const { h, s, l } = hexToHSL(hex);

    root.style.setProperty("--color-primary", hex);
    root.style.setProperty(
      "--color-primary-hover",
      `hsl(${h}, ${s}%, ${Math.min(l + 10, 95)}%)`
    );
    root.style.setProperty(
      "--color-primary-active",
      `hsl(${h}, ${s}%, ${Math.max(l - 10, 5)}%)`
    );
    root.style.setProperty("--color-primary-subtle", `hsl(${h}, ${s}%, 96%)`);
    root.style.setProperty("--color-primary-muted", `hsl(${h}, ${s}%, 92%)`);
    root.style.setProperty("--color-text-link", hex);
    root.style.setProperty("--color-border-focus", hex);
    root.style.setProperty("--color-nav-active-text", hex);
    root.style.setProperty("--color-nav-active-bg", `hsl(${h}, ${s}%, 96%)`);
  }

  private clearAccountTheme() {
    this.currentAccountTheme = null;
    const root = document.documentElement;
    const props = [
      "--color-primary",
      "--color-primary-hover",
      "--color-primary-active",
      "--color-primary-subtle",
      "--color-primary-muted",
      "--color-text-link",
      "--color-border-focus",
      "--color-nav-active-text",
      "--color-nav-active-bg",
    ];
    props.forEach((p) => root.style.removeProperty(p));
  }

  private applyFavicon(url: string) {
    const link =
      document.querySelector<HTMLLinkElement>("link[rel~='icon']") ??
      document.createElement("link");
    link.rel = "icon";
    link.href = url;
    document.head.appendChild(link);
  }
}

export const themeService = new ThemeService();
export default themeService;
