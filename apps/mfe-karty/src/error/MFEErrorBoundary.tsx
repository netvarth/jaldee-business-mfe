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
  error?: Error;
}

const PRODUCT_LABELS: Record<string, string> = {
  "mfe-karty": "Karty",
};

export class MFEErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
          <p className="mt-1 text-xs text-slate-500">
            {productLabel} encountered an unexpected error.
          </p>

          {this.state.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-left">
              <div className="text-xs font-bold text-red-800 font-mono">
                {this.state.error.name}: {this.state.error.message}
              </div>
              {this.state.error.stack && (
                <pre className="mt-2 text-[10.5px] text-red-700 font-mono overflow-auto max-h-56 whitespace-pre-wrap leading-relaxed">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}

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
