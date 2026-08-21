/**
 * Design tokens for the Karty customer record, straight from the
 * "Karty Customer Detail" design deliverable. Exposed as CSS custom properties on the
 * page root so the whole screen switches light/dark from one place.
 */

export const KARTY_THEMES = {
  light: {
    bg: "#f4f6f8",
    surface: "#ffffff",
    surface2: "#f7f9fa",
    surface3: "#eef1f3",
    border: "#e8ebee",
    border2: "#d5dade",
    text: "#1a2129",
    text2: "#4a5560",
    text3: "#8a94a0",
    accent: "#12a594",
    accentHover: "#0e8578",
    accentWeak: "#e2f4f1",
    accentBorder: "#bfe6dc",
    accentDeep: "#17806f",
    onAccent: "#ffffff",
    avatarBg: "#bfe6dc",
    avatarFg: "#0e7566",
    good: "#16a34a",
    goodWeak: "#e7f6ec",
    bad: "#dc2f3c",
    badWeak: "#fdecee",
    shadow: "0 1px 2px rgba(20,30,40,.05)",
    shadowLg: "0 12px 32px rgba(20,30,40,.14)",
  },
  dark: {
    bg: "#0e1214",
    surface: "#161b1e",
    surface2: "#1c2226",
    surface3: "#262e33",
    border: "#262e33",
    border2: "#374149",
    text: "#eef2f3",
    text2: "#a6b0b6",
    text3: "#6f7a82",
    accent: "#2dd4bf",
    accentHover: "#5ee0cf",
    accentWeak: "#0f2e2a",
    accentBorder: "#1c4640",
    accentDeep: "#0f8377",
    onAccent: "#04201c",
    avatarBg: "#124b43",
    avatarFg: "#6fe6d4",
    good: "#34c579",
    goodWeak: "#12291f",
    bad: "#f2646f",
    badWeak: "#2c1518",
    shadow: "0 1px 2px rgba(0,0,0,.3)",
    shadowLg: "0 14px 34px rgba(0,0,0,.5)",
  },
} as const;

export type KartyTheme = typeof KARTY_THEMES.light;

/**
 * Whether to render the dark variant.
 *
 * Deliberately NOT `prefers-color-scheme`: the shell around this page is light-only, and
 * following the OS setting would put a dark record inside a light app. The dark tokens are
 * kept ready for the day the shell gains a theme switch — it only has to set
 * `data-theme="dark"` (or a `dark` class) on <html> or <body>, the convention the design
 * system already uses.
 */
export function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return (
    root.dataset.theme === "dark" ||
    root.classList.contains("dark") ||
    document.body.dataset.theme === "dark" ||
    document.body.classList.contains("dark")
  );
}

/**
 * Order status presentation. Keys are the real `OrderStatus` values from
 * feature-commerce-service — the design's mock used a Draft/Packed pair the backend does
 * not have, and PENDING / RETURNED which it does, so the palette is mapped onto the
 * statuses that can actually come back rather than the mock's.
 */
export const ORDER_STATUS_STYLE: Record<
  string,
  { label: string; dot: string; bg: string; fg: string; darkBg: string; darkFg: string }
> = {
  PENDING: { label: "Pending", dot: "#d98a09", bg: "#fdf2dc", fg: "#a76a05", darkBg: "#2e2410", darkFg: "#e0a848" },
  CONFIRMED: { label: "Confirmed", dot: "#12a594", bg: "#e2f4f1", fg: "#0d7d6f", darkBg: "#0f2e2a", darkFg: "#4fd8c6" },
  SHIPPED: { label: "Shipped", dot: "#2563eb", bg: "#e5edfd", fg: "#1d4ed8", darkBg: "#141f3a", darkFg: "#6a97f0" },
  DELIVERED: { label: "Delivered", dot: "#16a34a", bg: "#e7f6ec", fg: "#0b7c3c", darkBg: "#12291f", darkFg: "#3fce82" },
  CANCELLED: { label: "Cancelled", dot: "#b0b6c3", bg: "#f2f3f6", fg: "#9aa0ae", darkBg: "#20262b", darkFg: "#7b858d" },
  RETURNED: { label: "Returned", dot: "#8a94a0", bg: "#eef1f3", fg: "#5a6470", darkBg: "#252d33", darkFg: "#9aa4ac" },
};

/** Statuses that still need someone to do something. Drives the "Open Orders" tile. */
export const OPEN_ORDER_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED"];

export const RETURN_STATUS_STYLE: Record<
  string,
  { label: string; dot: string; bg: string; fg: string; darkBg: string; darkFg: string }
> = {
  DRAFT: { label: "Draft", dot: "#8a94a0", bg: "#eef1f3", fg: "#5a6470", darkBg: "#252d33", darkFg: "#9aa4ac" },
  PENDING: { label: "In review", dot: "#d98a09", bg: "#fdf2dc", fg: "#a76a05", darkBg: "#2e2410", darkFg: "#e0a848" },
  COMPLETED: { label: "Completed", dot: "#16a34a", bg: "#e7f6ec", fg: "#0b7c3c", darkBg: "#12291f", darkFg: "#3fce82" },
};

export const REFUND_STATUS_LABEL: Record<string, string> = {
  NONE: "No refund",
  PENDING: "Pending refund",
  REFUNDED: "Refunded",
};

/** ₹ with Indian digit grouping, no decimals — the design's money format. */
export function inr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** "6 days ago" / "2 hours ago" — used for the last-order and cart-activity captions. */
export function relativeTime(value?: string | null): string | null {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.round(months / 12)} year${Math.round(months / 12) === 1 ? "" : "s"} ago`;
}

export function initialsOf(name?: string | null): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
