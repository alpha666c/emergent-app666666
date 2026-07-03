import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MagnifyingGlass, Plus, Broadcast } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";

const WORKSPACE_LABELS = {
  "/inbox": ["Agent Workspace", "Inbox"],
  "/queues": ["Coach", "Queues"],
  "/team": ["Coach", "Team Performance"],
  "/war-room": ["Coach", "Incident War-Room"],
  "/coaching": ["Coach", "Coaching Board"],
  "/qa": ["Coach", "QA Reviews"],
  "/dashboard": ["Ops / Leadership", "Analyst Booth"],
  "/experiments": ["Ops", "Experiments"],
  "/summaries": ["Ops", "Match Reports"],
  "/knowledge": ["Library", "Knowledge Base"],
  "/macros": ["Library", "Macros"],
  "/onboarding": ["Guide", "Getting Started"],
  "/handoff": ["Engineering", "Handoff SITREP"],
  "/cases/new": ["Agent", "New Case"],
};

function workspaceFor(pathname) {
  const exact = WORKSPACE_LABELS[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/cases/")) return ["Agent", "Case Detail"];
  if (pathname.startsWith("/incidents/")) return ["Coach", "Incident Detail"];
  return ["", ""];
}

export default function TopBar({ onSearch }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState("");
  const [ws, sub] = workspaceFor(pathname);

  useEffect(() => { setQ(""); }, [pathname]);

  const submit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(q);
    else if (q.trim()) nav(`/inbox?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur h-14 flex items-center px-4 lg:px-6" data-testid="topbar">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold hidden md:block">{ws}</div>
        {ws && <div className="w-px h-4 bg-zinc-200 hidden md:block" />}
        <div className="font-display font-bold tracking-tight text-sm truncate">{sub}</div>
      </div>

      <form onSubmit={submit} className="ml-6 hidden md:flex items-center flex-1 max-w-xl">
        <div className="relative w-full">
          <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="global-search"
            placeholder="Search cases, customers, tags…"
            className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#002FA7] transition-colors"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <button
          data-testid="topbar-warroom"
          onClick={() => nav("/war-room")}
          className="hidden sm:flex items-center gap-1.5 text-xs border border-zinc-200 px-3 py-1.5 hover:border-zinc-900 transition-colors"
          title="Incident War-Room"
        >
          <Broadcast size={12} weight="fill" className="text-red-600" />
          <span className="hidden lg:inline">War-Room</span>
        </button>
        <button
          data-testid="topbar-new-case"
          onClick={() => nav("/cases/new")}
          className="flex items-center gap-1.5 text-xs bg-[#002FA7] text-white px-3 py-1.5 hover:bg-[#00227A] transition-colors"
        >
          <Plus size={12} weight="bold" />
          <span className="hidden sm:inline">New Case</span>
        </button>
        <div className="w-px h-6 bg-zinc-200 mx-1 hidden sm:block" />
        <div className="flex items-center gap-2 pl-1">
          {user?.avatar_url ? (
            <img src={user.avatar_url} className="w-7 h-7 object-cover" alt="" />
          ) : (
            <div className="w-7 h-7 bg-zinc-900 text-white text-[10px] flex items-center justify-center">
              {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
          )}
          <div className="hidden lg:block leading-tight">
            <div className="text-xs font-medium text-zinc-900">{user?.name}</div>
            <div className="text-[9px] uppercase tracking-widest text-zinc-500">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
