import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Login from "@/pages/Login";
import Inbox from "@/pages/Inbox";
import CaseDetail from "@/pages/CaseDetail";
import Queues from "@/pages/Queues";
import TeamPerformance from "@/pages/TeamPerformance";
import OpsDashboard from "@/pages/OpsDashboard";
import WarRoom from "@/pages/WarRoom";
import IncidentDetail from "@/pages/IncidentDetail";
import Coaching from "@/pages/Coaching";
import QAReviews from "@/pages/QAReviews";
import Experiments from "@/pages/Experiments";
import Summaries from "@/pages/Summaries";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Macros from "@/pages/Macros";
import Onboarding from "@/pages/Onboarding";
import Handoff from "@/pages/Handoff";
import "@/App.css";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav("/login"); }, [loading, user, nav]);
  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
  if (!user) return null;
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/queues" element={<Queues />} />
            <Route path="/team" element={<TeamPerformance />} />
            <Route path="/dashboard" element={<OpsDashboard />} />
            <Route path="/war-room" element={<WarRoom />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route path="/coaching" element={<Coaching />} />
            <Route path="/qa" element={<QAReviews />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/summaries" element={<Summaries />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/macros" element={<Macros />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/handoff" element={<Handoff />} />
            <Route path="/admin/handoff" element={<Handoff />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
