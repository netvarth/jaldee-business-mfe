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

  return (
    <div className="flex min-h-screen bg-[#f7f9fc] text-slate-900">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-8">
          <div className="min-w-0">
            <div className="truncate text-lg font-black tracking-tight text-slate-900">Jaldee Employee</div>
            <div className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{workspaceName}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-slate-50 p-1">
              <div className="rounded-full bg-[#2e6f67] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
                Employee View
              </div>
            </div>
            <Avatar name={userName} size="md" />
            <div className="hidden min-w-0 lg:block">
              <div className="truncate text-sm font-black">{userName}</div>
              <div className="truncate text-[11px] font-bold text-slate-400">{workspaceName}</div>
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
