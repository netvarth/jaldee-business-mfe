import React from "react";
import type { MFEError, TelemetryService } from "@jaldee/auth-context";
import { Button } from "@jaldee/design-system";

interface Props {
  mfeName: string;
  onError: (error: MFEError) => void;
  telemetry: TelemetryService;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

const PRODUCT_LABELS: Record<string, string> = {
  "mfe-karty": "Karty",
};

export class MFEErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError({
      mfe: this.props.mfeName,
      code: "RENDER_FAILED",
      message: error.message,
      severity: "fatal",
      context: {
        componentStack: info.componentStack,
      },
    });

    this.props.telemetry.captureError(error, {
      mfe: this.props.mfeName,
      severity: "critical",
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const productLabel = PRODUCT_LABELS[this.props.mfeName] ?? this.props.mfeName;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-600">
            {productLabel} encountered an unexpected error. Your data is safe.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => window.location.reload()}>Reload page</Button>
            <Button variant="ghost" onClick={() => window.history.back()}>
              Go back
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
