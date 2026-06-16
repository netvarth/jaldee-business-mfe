import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-root">
      <div className="app-body">
        {/* MAIN CONTENT */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
