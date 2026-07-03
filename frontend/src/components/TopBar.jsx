import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MagnifyingGlass, Plus, Broadcast, Moon, Sun } from "@phosphor-icons/react";
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
  const [theme, setTheme] = useState("light");

  useEffect(() => { setQ(""); }, [pathname]);
  useEffect(() => {
    const stored = window.localStorage.getItem("touchline_theme");
    const initial = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("touchline_theme", next);
  };

  const submit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(q);
    else if (q.trim()) nav(`/inbox?q=${encodeURIComponent(q)}`);
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-white/80 dark:bg-card/80 backdrop-blur h-14 flex items-center px-4 lg:px-6 transition-colors"
      data-testid="topbar"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold hidden md:block">
          {ws}
        </div>
        {ws && <div className="w-px h-4 bg-border hidden md:block" />}
        <div className="font-display font-bold tracking-tight text-sm truncate text-foreground">
          {sub}
        </div>
      </div>

      <form
        onSubmit={submit}
        className="ml-6 hidden md:flex items-center flex-1 max-w-xl"
      >
        <div className="relative w-full">
          <MagnifyingGlass
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-colors"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="global-search"
            placeholder="Search cases, customers, tags…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-none bg-secondary text-foreground border border-input focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="hidden sm:inline-flex items-center justify-center w-8 h-8 border border-border bg-card text-foreground hover:bg-secondary transition-colors"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          data-testid="theme-toggle"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button
          data-testid="topbar-warroom"
          onClick={() => nav("/war-room")}
          className="hidden sm:flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 bg-card hover:bg-secondary transition-colors"
          title="Incident War-Room"
        >
          <Broadcast size={12} weight="fill" className="text-red-600" />
          <span className="hidden lg:inline">War-Room</span>
        </button>
        <button
          data-testid="topbar-new-case"
          onClick={() => nav("/cases/new")}
          className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90 transition-colors"
        >
          <Plus size={12} weight="bold" />
          <span className="hidden sm:inline">New Case</span>
        </button>
        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
        <div className="flex items-center gap-2 pl-1">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              className="w-7 h-7 object-cover rounded-none border border-border"
              alt="avatar"
            />
          ) : (
            <div className="w-7 h-7 bg-foreground text-background text-[10px] flex items-center justify-center">
              {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          )}
          <div className="hidden lg:block leading-tight">
            <div className="text-xs font-medium text-foreground">{user?.name}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {user?.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
