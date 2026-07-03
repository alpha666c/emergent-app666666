export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-zinc-100 ${className}`} />;
}

export function ListSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-3 flex items-center gap-3">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-24 w-full mt-4" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
