import React from "react";
import ReactDOM from "react-dom/client";
import { MFEPropsContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";
import App from "./App";

// Contract version — shell checks this on mount
export const CONTRACT_VERSION = "3.4";

let root: ReactDOM.Root | null = null;
const cleanupFns: Array<() => void> = [];

export function mount(container: HTMLElement, props: MFEProps) {
     console.log("[mfe-health] mount called", props.basePath);
  root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <MFEPropsContext.Provider value={props}>
        <App />
      </MFEPropsContext.Provider>
    </React.StrictMode>
  );
}

export function unmount(_container: HTMLElement) {
  // Run all cleanup functions
  // event bus listeners, RxJS subscriptions etc.
  cleanupFns.forEach(fn => fn());
  cleanupFns.length = 0;
  root?.unmount();
  root = null;
}

// Call this from anywhere inside mfe-health
// to register cleanup on unmount
export function registerCleanup(fn: () => void) {
  cleanupFns.push(fn);
}