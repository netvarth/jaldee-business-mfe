import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";
import App from "./App";
import { MFEErrorBoundary } from "./error/MFEErrorBoundary";
import { ensureApiClientInitialized } from "./lib/apiClient";

// Contract version - shell checks this on mount
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
  currentContainer = container;
  currentProps = props;
  root = ReactDOM.createRoot(container);
  ensureApiClientInitialized(props.mfeName, props.authToken);
  renderApp(props);
}

export function unmount(_container: HTMLElement) {
  // Run all cleanup functions (event bus listeners, subscriptions, etc.)
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
  renderApp(currentProps);
}
