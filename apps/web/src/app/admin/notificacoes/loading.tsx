export default function NotificacoesLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-36 bg-surface-subtle rounded animate-pulse" />
      </div>
      <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-surface-subtle rounded-full animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-surface-subtle rounded animate-pulse" />
              <div className="h-3 w-32 bg-surface-subtle rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
