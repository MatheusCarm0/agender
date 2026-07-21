export default function ClientesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-28 bg-surface-subtle rounded animate-pulse" />
        <div className="h-9 w-48 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] overflow-hidden">
        <div className="h-10 bg-surface-subtle animate-pulse" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-border-default">
            <div className="w-9 h-9 rounded-full bg-surface-subtle animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-surface-subtle rounded animate-pulse" />
              <div className="h-3 w-44 bg-surface-subtle rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
