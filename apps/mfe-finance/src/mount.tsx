import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";
import App from "./App";
import { MFEErrorBoundary } from "./error/MFEErrorBoundary";

export const CONTRACT_VERSION = "3.4";

let root: ReactDOM.Root | null = null;
const cleanupFns: Array<() => void> = [];

export function mount(container: HTMLElement, props: MFEProps) {
  root = ReactDOM.createRoot(container);
  root.render(
    <MFEPropsContext.Provider value={props}>
      <BrowserRouter basename={props.basePath}>
        <MFEErrorBoundary
          mfeName={props.mfeName}
          onError={props.onError}
          telemetry={props.telemetry}
        >
          <App />
        </MFEErrorBoundary>
      </BrowserRouter>
    </MFEPropsContext.Provider>
  );
}

export function unmount(_container: HTMLElement) {
  cleanupFns.forEach((fn) => fn());
  cleanupFns.length = 0;
  root?.unmount();
  root = null;
}

export function registerCleanup(fn: () => void) {
  cleanupFns.push(fn);
}
