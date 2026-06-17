import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import { ensureApiClientInitialized } from "./lib/apiClient";
import "./index.css";
import App from "./App";
import { mockMFEProps } from "./dev/mockMFEProps";

ensureApiClientInitialized(mockMFEProps.mfeName, mockMFEProps.authToken);

// Standalone dev bootstrap. In federation, the shell calls mount() instead and
// supplies real MFEProps; here we inject a mock so the app runs on its own.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MFEPropsContext.Provider value={mockMFEProps}>
      <BrowserRouter basename={mockMFEProps.basePath}>
        <App />
      </BrowserRouter>
    </MFEPropsContext.Provider>
  </StrictMode>
);
