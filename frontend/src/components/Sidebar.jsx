import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Ticket, Users, Books, Broadcast, Flask, Trophy, ChartLine,
  GraduationCap, SignOut, PottedPlant, Star, CaretLeft, CaretRight,
  House, ChatCircle, ClipboardText,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "touchline_sidebar_collapsed";

const Item = ({ to, icon: Icon, label, testId, collapsed }) => (
  <NavLink
    to={to}
    end
    data-testid={testId}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      `flex items-center gap-3 ${collapsed ? "px-3 py-2.5 justify-center" : "px-4 py-2"} text-sm border-l-2 transition-colors duration-150 ${
        isActive
          ? "border-[#002FA7] bg-zinc-50 text-zinc-900 font-medium"
          : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`
    }
  >
    <Icon size={17} weight="regular" className="shrink-0" />
    {!collapsed && <span className="truncate">{label}</span>}
  </NavLink>
);

const SectionLabel = ({ children, collapsed }) => collapsed ? (
  <div className="mx-3 mt-3 mb-1 h-px bg-zinc-200" />
) : (
  <div className="px-4 pt-3 pb-1 text-[9px] uppercase tracking-[0.15em] text-zinc-400 font-semibold">{children}</div>
);

export default function Sidebar() {
  const { user, company, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  useEffect(() => { localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); }, [collapsed]);

  const isManager = user?.role === "lead" || user?.role === "admin";

  return (
    <aside
      data-testid="sidebar"
      data-collapsed={collapsed}
      className={`shrink-0 border-r border-zinc-200 bg-white flex flex-col h-screen sticky top-0 transition-[width] duration-200 ${collapsed ? "w-14" : "w-56"}`}
    >
      {/* Brand */}
      <div className={`border-b border-zinc-200 h-14 flex items-center ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-[#002FA7] text-white flex items-center justify-center font-display font-bold shrink-0">T</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display font-bold text-[15px] tracking-tight leading-none truncate">Touchline</div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-zinc-500 mt-0.5 truncate" title={company?.name}>{company?.name || "SupportOps Brain"}</div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        <SectionLabel collapsed={collapsed}>Work</SectionLabel>
        <Item to="/inbox" icon={Ticket} label="Inbox" testId="nav-inbox" collapsed={collapsed} />
        <Item to="/queues" icon={PottedPlant} label="Queues" testId="nav-queues" collapsed={collapsed} />

        {isManager && (
          <>
            <SectionLabel collapsed={collapsed}>Coach</SectionLabel>
            <Item to="/team" icon={Users} label="Team" testId="nav-team" collapsed={collapsed} />
            <Item to="/war-room" icon={Broadcast} label="War-Room" testId="nav-war-room" collapsed={collapsed} />
            <Item to="/coaching" icon={GraduationCap} label="Coaching" testId="nav-coaching" collapsed={collapsed} />
            <Item to="/qa" icon={Star} label="QA" testId="nav-qa" collapsed={collapsed} />

            <SectionLabel collapsed={collapsed}>Analyze</SectionLabel>
            <Item to="/dashboard" icon={ChartLine} label="Ops Dashboard" testId="nav-dashboard" collapsed={collapsed} />
            <Item to="/experiments" icon={Flask} label="Experiments" testId="nav-experiments" collapsed={collapsed} />
            <Item to="/summaries" icon={Trophy} label="Match Reports" testId="nav-summaries" collapsed={collapsed} />
          </>
        )}

        <SectionLabel collapsed={collapsed}>Library</SectionLabel>
        <Item to="/knowledge" icon={Books} label="Knowledge" testId="nav-knowledge" collapsed={collapsed} />
        <Item to="/macros" icon={ChatCircle} label="Macros" testId="nav-macros" collapsed={collapsed} />

        <SectionLabel collapsed={collapsed}>Guide</SectionLabel>
        <Item to="/onboarding" icon={House} label="Getting Started" testId="nav-onboarding" collapsed={collapsed} />
        {user?.role === "admin" && (
          <Item to="/handoff" icon={ClipboardText} label="Handoff" testId="nav-handoff" collapsed={collapsed} />
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        data-testid="sidebar-collapse-btn"
        title={collapsed ? "Expand" : "Collapse"}
        className={`border-t border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors ${collapsed ? "py-3 flex justify-center" : "px-4 py-2 flex items-center gap-2 text-xs"}`}
      >
        {collapsed ? <CaretRight size={14} /> : <><CaretLeft size={14} /><span>Collapse</span></>}
      </button>

      {/* User */}
      <div className={`border-t border-zinc-200 ${collapsed ? "p-2 flex justify-center" : "p-3"}`}>
        {collapsed ? (
          <button onClick={logout} data-testid="logout-btn" title="Sign out" className="text-zinc-400 hover:text-zinc-900 transition-colors">
            <SignOut size={18} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="w-8 h-8 object-cover" alt="" />
            ) : (
              <div className="w-8 h-8 bg-zinc-900 text-white text-xs flex items-center justify-center font-medium">
                {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-900 truncate" data-testid="sidebar-user-name">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">{user?.role}</div>
            </div>
            <button
              data-testid="logout-btn"
              onClick={logout}
              title="Sign out"
              className="text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <SignOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
