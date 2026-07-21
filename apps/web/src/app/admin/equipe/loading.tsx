export default function EquipeLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-surface-subtle rounded animate-pulse" />
        <div className="h-9 w-40 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] overflow-hidden">
        <div className="h-10 bg-surface-subtle animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-t border-border-default">
            <div className="w-9 h-9 rounded-full bg-surface-subtle animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-28 bg-surface-subtle rounded animate-pulse" />
              <div className="h-3 w-36 bg-surface-subtle rounded animate-pulse" />
            </div>
            <div className="h-5 w-14 bg-surface-subtle rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
