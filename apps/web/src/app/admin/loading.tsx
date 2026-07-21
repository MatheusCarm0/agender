export default function AdminLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-32 bg-surface-subtle rounded animate-pulse" />
        <div className="h-4 w-56 bg-surface-subtle rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
        ))}
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] overflow-hidden">
        <div className="h-10 bg-surface-subtle animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 border-t border-border-default animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  );
}
