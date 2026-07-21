export default function FidelidadeLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-28 bg-surface-subtle rounded animate-pulse" />
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
