export default function CuponsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-surface-subtle rounded animate-pulse" />
        <div className="h-9 w-32 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] overflow-hidden">
        <div className="h-10 bg-surface-subtle animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 border-t border-border-default animate-pulse" />
        ))}
      </div>
    </div>
  );
}
