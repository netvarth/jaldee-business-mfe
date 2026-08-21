import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";
import "./index.css";
import App from "./App";
import { MFEErrorBoundary } from "./error/MFEErrorBoundary";
import { ensureApiClientInitialized } from "./lib/apiClient";
import { setShellHttpBridge } from "./lib/httpClient";

export const CONTRACT_VERSION = "3.4";

let root: ReactDOM.Root | null = null;
let currentContainer: HTMLElement | null = null;
let currentProps: MFEProps | null = null;
const cleanupFns: Array<() => void> = [];

function renderApp(props: MFEProps) {
  root?.render(
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

export function mount(container: HTMLElement, props: MFEProps) {
  // Always initialize the raw apiClient singleton, even when the shell also provides a
  // props.api bridge: @jaldee/shared-modules code (analyticsService, etc.) imports apiClient
  // directly from @jaldee/api-client, bypassing httpClient.ts's shellHttpBridge indirection.
  // Treating these as either/or left that singleton permanently unassigned (undefined) here,
  // since the shell always supplies props.api — every direct apiClient consumer threw
  // "Cannot read properties of undefined (reading 'post')" on every call, no exceptions.
  ensureApiClientInitialized(props.mfeName, props.authToken);
  if (props.api) {
    setShellHttpBridge(props.api);
  }
  currentContainer = container;
  currentProps = props;
  root = ReactDOM.createRoot(container);
  renderApp(props);
}

export function unmount(_container: HTMLElement) {
  setShellHttpBridge(null);
  cleanupFns.forEach((fn) => fn());
  cleanupFns.length = 0;
  root?.unmount();
  root = null;
  currentContainer = null;
  currentProps = null;
}

export function registerCleanup(fn: () => void) {
  cleanupFns.push(fn);
}

export function updateProps(nextProps: Partial<MFEProps>) {
  if (!root || !currentContainer || !currentProps) {
    return;
  }

  currentProps = { ...currentProps, ...nextProps };

  ensureApiClientInitialized(currentProps.mfeName, currentProps.authToken);
  if (currentProps.api) {
    setShellHttpBridge(currentProps.api);
  }

  renderApp(currentProps);
}
