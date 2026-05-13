import type { SVGProps } from "react";
import { cn } from "../../utils";

export type IconName =
  | "alert"
  | "box"
  | "cart"
  | "chart"
  | "database"
  | "globe"
  | "history"
  | "layers"
  | "list"
  | "packagePlus"
  | "refresh"
  | "tag"
  | "trend"
  | "warehouse"
  | "x";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
}

export function Icon({ name, className, ...props }: IconProps) {
  const sharedProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    className: cn("h-4 w-4", className),
    ...props,
  };

  switch (name) {
    case "cart":
      return <svg {...sharedProps}><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /><path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" /></svg>;
    case "tag":
      return <svg {...sharedProps}><path d="M20 12l-8 8-9-9V4h7l10 8z" /><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" /></svg>;
    case "box":
      return <svg {...sharedProps}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12l8-4.5" /><path d="M12 12L4 7.5" /><path d="M12 12v9" /></svg>;
    case "packagePlus":
      return <svg {...sharedProps}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 8v6" /><path d="M9 11h6" /></svg>;
    case "database":
      return <svg {...sharedProps}><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    case "list":
      return <svg {...sharedProps}><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" /></svg>;
    case "refresh":
      return <svg {...sharedProps}><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M6.5 9A7 7 0 0 1 18 6" /><path d="M17.5 15A7 7 0 0 1 6 18" /></svg>;
    case "globe":
      return <svg {...sharedProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18" /><path d="M12 3a15 15 0 0 0 0 18" /></svg>;
    case "trend":
      return <svg {...sharedProps}><path d="M4 16l5-5 4 4 7-7" /><path d="M14 8h6v6" /></svg>;
    case "warehouse":
      return <svg {...sharedProps}><path d="M3 10l9-6 9 6" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>;
    case "chart":
      return <svg {...sharedProps}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>;
    case "history":
      return <svg {...sharedProps}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v6l4 2" /></svg>;
    case "layers":
      return <svg {...sharedProps}><path d="M12 4l8 4-8 4-8-4 8-4z" /><path d="M4 12l8 4 8-4" /><path d="M4 16l8 4 8-4" /></svg>;
    case "alert":
      return <svg {...sharedProps}><path d="M12 4l8 14H4L12 4z" /><path d="M12 9v4" /><circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" /></svg>;
    case "x":
      return <svg {...sharedProps}><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default:
      return null;
  }
}
