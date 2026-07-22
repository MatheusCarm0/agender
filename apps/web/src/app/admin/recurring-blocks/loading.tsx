export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-40 bg-surface-subtle rounded animate-pulse" />
        <div className="h-4 w-64 bg-surface-subtle rounded animate-pulse mt-2" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  );
}

