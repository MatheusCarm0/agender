export default function CustomizationLoading() {
  return (
    <div>
      <div className="h-7 w-40 bg-surface-subtle rounded animate-pulse mb-6" />
      <div className="lg:grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
        <div className="h-[500px] bg-surface-subtle rounded-[var(--radius-md)] animate-pulse mt-6 lg:mt-0" />
      </div>
    </div>
  );
}
