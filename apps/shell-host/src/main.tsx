import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { initTelemetry, telemetryService } from "./services/telemetry";
import "./index.css";

// Initialise PostHog before anything else renders.
initTelemetry();

if (typeof window !== "undefined") {
  (window as any).__JALDEE_AUTH_MODE__ = import.meta.env.VITE_AUTH_MODE;

  // Global error listener for unhandled exceptions
  window.addEventListener("error", (event) => {
    if (event.error) {
      telemetryService.captureError(event.error);
    } else {
      telemetryService.captureError(new Error(event.message));
    }
  });

  // Global listener for unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    telemetryService.captureError(error);
  });

  // Global listener for REST API errors (500+ or network errors) dispatched by the API Client
  window.addEventListener("jaldee:api:error", (event: any) => {
    const error = event.detail;
    telemetryService.captureError(error, {
      type: "API_ERROR",
      status: error.response?.status,
      apiUrl: error.config?.url,
      method: error.config?.method,
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);

