import { DashboardError } from "@/components/dashboard-error"
import { SpendDashboard } from "@/components/spend-dashboard"
import { loadDashboardSnapshot } from "@/lib/dashboard-data"
import { getNetWorthProfile } from "@/lib/net-worth"
import {
  getPublicDemoNetWorthProfile,
  isPublicDemoMode,
} from "@/lib/public-demo-data"

export const dynamic = "force-dynamic"

export default async function NetWorthPage() {
  const result = await loadDashboardSnapshot()

  if (
    result.error ||
    !result.snapshot ||
    !result.preferences ||
    !result.budgets
  ) {
    return <DashboardError error={result.error} />
  }

  const netWorthProfile = isPublicDemoMode()
    ? getPublicDemoNetWorthProfile()
    : getNetWorthProfile()

  return (
    <SpendDashboard
      snapshot={result.snapshot}
      preferences={result.preferences}
      budgets={result.budgets}
      netWorthProfile={netWorthProfile}
      view="net-worth"
    />
  )
}
