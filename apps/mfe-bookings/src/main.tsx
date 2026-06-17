import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import "./index.css";
import App from "./App";
import { mockMFEProps } from "./dev/mockMFEProps";
import { ensureApiClientInitialized } from "./lib/apiClient";

ensureApiClientInitialized(mockMFEProps.mfeName, mockMFEProps.authToken);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MFEPropsContext.Provider value={mockMFEProps}>
      <BrowserRouter basename={mockMFEProps.basePath}>
        <App />
      </BrowserRouter>
    </MFEPropsContext.Provider>
  </StrictMode>
);
