export function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-lg bg-secondary/60" />
          <div className="h-4 w-80 rounded bg-secondary/50" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 rounded-lg bg-secondary/60" />
          <div className="h-9 w-32 rounded-lg bg-secondary/60" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-secondary/60" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 rounded-2xl bg-secondary/60" />
        <div className="h-80 rounded-2xl bg-secondary/60" />
      </div>
    </div>
  )
}
