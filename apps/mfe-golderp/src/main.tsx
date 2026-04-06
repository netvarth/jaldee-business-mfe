import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ensureApiClientInitialized } from "./lib/apiClient";
import { setShellHttpBridge } from "./lib/httpClient";

setShellHttpBridge(null);
ensureApiClientInitialized("mfe_golderp");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
