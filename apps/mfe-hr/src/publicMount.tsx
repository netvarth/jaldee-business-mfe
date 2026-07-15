import ReactDOM from "react-dom/client";
import { MFEPropsContext, MFE_CONTRACT_VERSION, type MFEProps } from "@jaldee/auth-context";
import { ensureApiClientInitialized } from "./lib/apiClient";
import { MFEErrorBoundary } from "./error/MFEErrorBoundary";
import PublicCareersApp from "./pages/careers/PublicCareersApp";

export const CONTRACT_VERSION = MFE_CONTRACT_VERSION;

let root: ReactDOM.Root | null = null;
let currentProps: MFEProps | null = null;

function renderApp(props: MFEProps) {
  root?.render(
    <MFEPropsContext.Provider value={props}>
      <MFEErrorBoundary mfeName={props.mfeName} onError={props.onError} telemetry={props.telemetry}>
        <PublicCareersApp />
      </MFEErrorBoundary>
    </MFEPropsContext.Provider>
  );
}

export function mount(container: HTMLElement, props: MFEProps) {
  ensureApiClientInitialized(props.mfeName, props.authToken);
  currentProps = props;
  root = ReactDOM.createRoot(container);
  renderApp(props);
}

export function unmount(_container: HTMLElement) {
  root?.unmount();
  root = null;
  currentProps = null;
}

export function updateProps(nextProps: Partial<MFEProps>) {
  if (!root || !currentProps) {
    return;
  }
  currentProps = { ...currentProps, ...nextProps };
  ensureApiClientInitialized(currentProps.mfeName, currentProps.authToken);
  renderApp(currentProps);
}
