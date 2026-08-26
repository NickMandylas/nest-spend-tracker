function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

export default function DashboardLoading() {
  return (
    <main className="min-h-svh bg-background p-2 sm:p-3">
      <div className="grid gap-3 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="min-h-80 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-3 h-8 w-44" />
                <Skeleton className="mt-2 h-4 w-32" />
              </div>
              <Skeleton className="size-9 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-28 w-full rounded-xl" />
            <Skeleton className="mt-3 h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-end justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="mt-2 h-7 w-48" />
          </div>
          <Skeleton className="h-8 w-52" />
        </div>
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
          <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="p-4 lg:border-r lg:border-border">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-7 w-20" />
              ))}
            </div>
            <Skeleton className="mt-4 h-64 w-full rounded-xl" />
          </div>
          <div className="border-t border-border p-4 lg:border-t-0">
            <Skeleton className="h-3 w-24" />
            <div className="mt-5 space-y-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="mt-2 h-px w-full rounded-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
