import { useMFEProps } from "@jaldee/auth-context";
import { Menu, Bell, Search } from "./icons";

interface TopbarProps {
  onMenuToggle: () => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { user } = useMFEProps();
  const primaryRole = user.roles[0]?.name ?? "User";

  return (
    <header
      id="bookings-topbar"
      data-testid="bookings-topbar"
      className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-30"
    >
      <div className="flex items-center gap-4">
        <button
          id="bookings-mobile-menu-toggle"
          data-testid="bookings-mobile-menu-toggle"
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <Menu size={20} />
        </button>
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="bookings-topbar-search"
            data-testid="bookings-topbar-search"
            type="text"
            placeholder="Search bookings..."
            className="pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none w-48 md:w-64 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button id="bookings-notifications-button" data-testid="bookings-notifications-button" className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        <div id="bookings-user-summary" data-testid="bookings-user-summary" className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            {initials(user.name)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500 capitalize">{primaryRole.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
