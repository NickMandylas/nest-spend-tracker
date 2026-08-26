import {
  IconChartLine,
  IconLayoutDashboard,
  IconListDetails,
  IconPigMoney,
  IconScale,
  IconSettings,
} from "@tabler/icons-react"

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

const navigation = [
  { label: "Overview", icon: IconLayoutDashboard, active: true },
  { label: "Net Worth", icon: IconScale, active: false },
  { label: "Forecast", icon: IconChartLine, active: false },
  { label: "Activity", icon: IconListDetails, active: false },
  { label: "Settings", icon: IconSettings, active: false },
]

export default function Loading() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="flex h-14 items-center px-3 sm:px-5 lg:px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-background">
              <IconPigMoney className="size-4" />
            </span>
            <span>
              <span className="block text-base leading-none font-semibold tracking-tight">
                Nest
              </span>
              <span className="mt-1 hidden text-[0.6rem] leading-none text-muted-foreground sm:block">
                Household ledger
              </span>
            </span>
          </div>

          <nav className="ml-7 hidden items-center gap-1 lg:flex">
            {navigation.map((item) => (
              <div
                key={item.label}
                className={`flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium ${
                  item.active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </div>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <SkeletonLine className="size-8 rounded-md" />
            <SkeletonLine className="h-8 w-28" />
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-3 py-1.5 sm:px-5 lg:hidden">
          {navigation.map((item) => (
            <div
              key={item.label}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[0.65rem] font-medium ${
                item.active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </div>
          ))}
        </nav>
      </header>

      <main className="w-full px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <SkeletonLine className="h-8 w-36" />
            <SkeletonLine className="mt-2 h-3 w-72 max-w-[72vw]" />
          </div>
          <SkeletonLine className="hidden h-3 w-32 sm:block" />
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="min-h-80 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <SkeletonLine className="h-3 w-28" />
                  <SkeletonLine className="mt-3 h-8 w-44" />
                  <SkeletonLine className="mt-2 h-4 w-32" />
                </div>
                <SkeletonLine className="size-9 rounded-full" />
              </div>
              <SkeletonLine className="mt-5 h-28 w-full rounded-xl" />
              <SkeletonLine className="mt-3 h-20 w-full rounded-xl" />
            </div>
          ))}
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-end justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <SkeletonLine className="h-2.5 w-28" />
              <SkeletonLine className="mt-2 h-7 w-48" />
            </div>
            <SkeletonLine className="h-8 w-52" />
          </div>
          <div className="border-b border-border px-4 py-3">
            <SkeletonLine className="h-3 w-40" />
            <SkeletonLine className="mt-2 h-4 w-56" />
            <SkeletonLine className="mt-2 h-1.5 w-full rounded-full" />
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="p-4 lg:border-r lg:border-border">
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonLine key={index} className="h-7 w-20" />
                ))}
              </div>
              <SkeletonLine className="mt-4 h-64 w-full rounded-xl" />
            </div>
            <div className="border-t border-border p-4 lg:border-t-0">
              <SkeletonLine className="h-3 w-24" />
              <div className="mt-5 space-y-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index}>
                    <SkeletonLine className="h-3 w-full" />
                    <SkeletonLine className="mt-2 h-px w-full rounded-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
