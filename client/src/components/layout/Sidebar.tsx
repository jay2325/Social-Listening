import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  Bell,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface NavItem {
  to:      string;
  icon:    React.ElementType;
  label:   string;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/",         icon: LayoutDashboard, label: "Overview",  enabled: true  },
  { to: "/mentions", icon: MessageSquare,   label: "Mentions",  enabled: true  },
  { to: "/trends",   icon: TrendingUp,      label: "Trends",    enabled: false },
  { to: "/alerts",   icon: Bell,            label: "Alerts",    enabled: false },
  { to: "/settings", icon: Settings,        label: "Settings",  enabled: false },
];

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-zinc-800">
        <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-zinc-100 text-sm tracking-tight">
          PulseBoard
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-2 mt-1">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label, enabled }) =>
            enabled ? (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-indigo-500/10 text-indigo-400"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              </li>
            ) : (
              <li key={to}>
                <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 select-none">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  <span className="ml-auto text-[10px] text-zinc-700 font-normal bg-zinc-800 px-1.5 py-0.5 rounded">
                    soon
                  </span>
                </div>
              </li>
            )
          )}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-700 text-center">Phase 1 · v0.1.0</p>
      </div>
    </aside>
  );
}
