export default function PlanoLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-20 bg-surface-subtle rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 space-y-4">
            <div className="h-5 w-24 bg-surface-subtle rounded animate-pulse" />
            <div className="h-8 w-20 bg-surface-subtle rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-3 w-full bg-surface-subtle rounded animate-pulse" />
              ))}
            </div>
            <div className="h-10 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
