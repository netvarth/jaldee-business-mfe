import type { ReactNode } from "react";
import IconRail from "./IconRail";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

interface Props {
  children: ReactNode;
}

export default function ShellLayout({ children }: Props) {
  return (
    <div
      data-testid="shell-layout"
      style={{ display: "flex", height: "100vh", background: "#F3F4F6" }}
    >
      {/* Left icon rail — fixed */}
      <IconRail />

      {/* Main area — offset for icon rail */}
      <div
        data-testid="shell-main"
        style={{
          marginLeft: "72px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Top bar — fixed */}
        <TopBar />

        {/* Below top bar */}
        <div
          style={{
            marginTop: "56px",
            flex: 1,
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* Secondary sidebar */}
          <Sidebar />

          {/* Page content */}
          <div
            data-testid="shell-content"
            style={{
              flex: 1,
              overflowY: "auto",
              background: "#F3F4F6",
              minHeight: 0,
            }}
          >
            {children}
          </div>

        </div>
      </div>

    </div>
  );
}