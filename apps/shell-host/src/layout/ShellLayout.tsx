import type { ReactNode } from "react";
import IconRail from "./IconRail";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import "./shell.css";

interface Props {
  children: ReactNode;
}

export default function ShellLayout({ children }: Props) {
  return (
    <div data-testid="shell-layout" className="shell-layout">
      <IconRail />
      <div data-testid="shell-main" className="shell-main">
        <TopBar />
        <div className="shell-body">
          <Sidebar />
          <div data-testid="shell-content" className="shell-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
