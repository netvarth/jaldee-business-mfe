import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { initTelemetry, telemetryService } from "./services/telemetry";
import "./index.css";

initTelemetry();

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    telemetryService.captureError(event.error instanceof Error ? event.error : new Error(event.message));
  });

  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    telemetryService.captureError(error);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
