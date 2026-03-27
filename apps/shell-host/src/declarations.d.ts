declare module "mfe_health/mount" {
  import type { MFEProps } from "@jaldee/auth-context";
  export function mount(container: HTMLElement, props: MFEProps): void;
  export function unmount(container: HTMLElement): void;
  export const CONTRACT_VERSION: string;
}

declare module "mfe_bookings/mount" {
  import type { MFEProps } from "@jaldee/auth-context";
  export function mount(container: HTMLElement, props: MFEProps): void;
  export function unmount(container: HTMLElement): void;
  export const CONTRACT_VERSION: string;
}