export default function WorkingHoursLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-28 bg-surface-subtle rounded animate-pulse" />
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-10 bg-surface-subtle rounded animate-pulse" />
            <div className="h-9 w-24 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
            <div className="h-4 w-4 bg-surface-subtle rounded animate-pulse" />
            <div className="h-9 w-24 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
