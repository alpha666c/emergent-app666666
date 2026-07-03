import { useParams, Link } from "react-router-dom";
import { CaretLeft } from "@phosphor-icons/react";
import CasePanel from "@/components/CasePanel";

export default function CaseDetail() {
  const { id } = useParams();
  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-zinc-50/40">
      <div className="px-6 py-2 border-b border-zinc-200 bg-white">
        <Link to="/inbox" className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1" data-testid="back-to-inbox">
          <CaretLeft size={12} /> Back to inbox
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <CasePanel caseId={id} />
      </div>
    </div>
  );
}
