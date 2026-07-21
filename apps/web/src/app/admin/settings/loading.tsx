export default function SettingsLoading() {
  return (
    <div>
      <div className="h-7 w-36 bg-surface-subtle rounded animate-pulse mb-6" />
      <div className="max-w-2xl space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 space-y-4">
            <div className="h-5 w-32 bg-surface-subtle rounded animate-pulse" />
            <div className="space-y-3">
              <div className="h-9 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
              <div className="h-9 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
