import { NavLink, useNavigate } from "react-router-dom";
import {
  House, Ticket, Users, Books, Broadcast, Flask, Trophy,
  ChartLine, GraduationCap, SignOut, PottedPlant, Star,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";

const Item = ({ to, icon: Icon, label, testId }) => (
  <NavLink
    to={to}
    end
    data-testid={testId}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 text-sm border-l-2 transition-colors duration-150 ${
        isActive
          ? "border-[#002FA7] bg-zinc-50 text-zinc-900 font-medium"
          : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`
    }
  >
    <Icon size={18} weight="regular" />
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar() {
  const { user, company, logout } = useAuth();
  const nav = useNavigate();
  const isManager = user?.role === "lead" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  return (
    <aside data-testid="sidebar" className="w-60 shrink-0 border-r border-zinc-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#002FA7] text-white flex items-center justify-center font-display font-bold">T</div>
          <div>
            <div className="font-display font-bold text-[15px] tracking-tight leading-none">Touchline</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">SupportOps Brain</div>
          </div>
        </div>
        {company && (
          <div className="mt-3 text-xs text-zinc-500 truncate" data-testid="sidebar-company">{company.name}</div>
        )}
      </div>

      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Play</div>
        <Item to="/inbox" icon={Ticket} label="Inbox" testId="nav-inbox" />
        <Item to="/queues" icon={PottedPlant} label="Queues" testId="nav-queues" />

        {isManager && (
          <>
            <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Coach</div>
            <Item to="/team" icon={Users} label="Team Performance" testId="nav-team" />
            <Item to="/war-room" icon={Broadcast} label="Incident War-Room" testId="nav-war-room" />
            <Item to="/coaching" icon={GraduationCap} label="Coaching Board" testId="nav-coaching" />
            <Item to="/qa" icon={Star} label="QA Reviews" testId="nav-qa" />
          </>
        )}

        {isManager && (
          <>
            <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Analyze</div>
            <Item to="/dashboard" icon={ChartLine} label="Ops Dashboard" testId="nav-dashboard" />
            <Item to="/experiments" icon={Flask} label="Experiments" testId="nav-experiments" />
            <Item to="/summaries" icon={Trophy} label="Match Reports" testId="nav-summaries" />
          </>
        )}

        <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Library</div>
        <Item to="/knowledge" icon={Books} label="Knowledge Base" testId="nav-knowledge" />
        <Item to="/macros" icon={Ticket} label="Macros" testId="nav-macros" />
        <Item to="/onboarding" icon={House} label="Getting Started" testId="nav-onboarding" />
      </nav>

      <div className="border-t border-zinc-200 p-3">
        <div className="flex items-center gap-2">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-8 h-8 object-cover" />
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
      </div>
    </aside>
  );
}
