export default function FinanceiroLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-32 bg-surface-subtle rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-4 space-y-2">
            <div className="h-3 w-20 bg-surface-subtle rounded animate-pulse" />
            <div className="h-7 w-28 bg-surface-subtle rounded animate-pulse" />
            <div className="h-3 w-16 bg-surface-subtle rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] overflow-hidden">
        <div className="h-10 bg-surface-subtle animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 border-t border-border-default animate-pulse" />
        ))}
      </div>
    </div>
  );
}
