export default function ServicesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-28 bg-surface-subtle rounded animate-pulse" />
        <div className="h-9 w-36 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] overflow-hidden">
        <div className="h-10 bg-surface-subtle animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5 border-t border-border-default">
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-surface-subtle rounded animate-pulse" />
              <div className="h-3 w-20 bg-surface-subtle rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-surface-subtle rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
