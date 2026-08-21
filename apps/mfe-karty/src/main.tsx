import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import "./index.css";
import App from "./App";
import { ensureApiClientInitialized } from "./lib/apiClient";
import { setShellHttpBridge } from "./lib/httpClient";
import { createStandaloneMfeProps } from "./dev/standaloneMfeProps";

setShellHttpBridge(null);
ensureApiClientInitialized("mfe_karty");

// Standalone preview has no shell, so provide a mock MFEPropsContext so components
// that call useMFEProps() (the API hooks) don't throw. The shell mounts via mount.tsx
// with real props; this file is only used by `vite dev`/`vite preview` on :3005.
const standaloneProps = createStandaloneMfeProps();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MFEPropsContext.Provider value={standaloneProps}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MFEPropsContext.Provider>
  </StrictMode>
);
