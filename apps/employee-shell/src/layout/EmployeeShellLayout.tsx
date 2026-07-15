import type { ReactNode } from "react";
import { Avatar, Button } from "@jaldee/design-system";
import { useAuth } from "../auth/AuthProvider";
import { useAppStore } from "../store/appStore";
import ShellToastHost from "./ShellToastHost";
import "./employeeShell.css";

export default function EmployeeShellLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const user = useAppStore((state) => state.user);
  const workspace = useAppStore((state) => state.workspace);
  const userName = user?.name || "Employee";
  const workspaceName = workspace?.name || "Employee Workspace";
  const workspaceLogoUrl = workspace?.logoUrl;

  return (
    <div className="flex min-h-screen bg-[#f7f9fc] text-slate-900">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-20 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar
              name={workspaceName}
              src={workspaceLogoUrl}
              size="lg"
              className="rounded-2xl border border-slate-200 bg-slate-50 text-slate-700"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium leading-tight text-slate-500">{workspaceName}</div>
              <div className="truncate text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Employee Portal</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Avatar name={userName} size="md" />
            <div className="hidden min-w-0 lg:block">
              <div className="truncate text-sm font-black">{userName}</div>
              <div className="truncate text-[11px] font-bold text-slate-400">Signed in</div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void logout()}
              className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-white"
            >
              Logout
            </Button>
          </div>
        </header>

        <div className="employee-content-area min-h-0 flex-1 overflow-y-auto">
          <div className="employee-content-inner">{children}</div>
        </div>
      </main>
      <ShellToastHost />
    </div>
  );
}
