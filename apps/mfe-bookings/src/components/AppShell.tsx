import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      id="bookings-app-root"
      data-testid="bookings-app-root"
      className="app-root"
    >
      <div
        id="bookings-app-body"
        data-testid="bookings-app-body"
        className="app-body"
      >
        {/* MAIN CONTENT */}
        <main
          id="bookings-main-content"
          data-testid="bookings-main-content"
          className="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
