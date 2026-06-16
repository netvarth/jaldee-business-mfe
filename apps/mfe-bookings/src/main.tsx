import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import "./index.css";
import App from "./App";
import { mockMFEProps } from "./dev/mockMFEProps";

// Standalone dev entry. In production the shell calls mount() from mount.tsx
// and provides real MFEProps; here we supply a mock so the app runs alone.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MFEPropsContext.Provider value={mockMFEProps}>
      <BrowserRouter basename={mockMFEProps.basePath}>
        <App />
      </BrowserRouter>
    </MFEPropsContext.Provider>
  </StrictMode>
);
