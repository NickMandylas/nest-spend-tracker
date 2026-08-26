import { DashboardError } from "@/components/dashboard-error"
import { SpendDashboard } from "@/components/spend-dashboard"
import { loadDashboardSnapshot } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const result = await loadDashboardSnapshot()

  if (
    result.error ||
    !result.snapshot ||
    !result.preferences ||
    !result.budgets
  ) {
    return <DashboardError error={result.error} />
  }

  return (
    <SpendDashboard
      snapshot={result.snapshot}
      preferences={result.preferences}
      budgets={result.budgets}
      view="settings"
    />
  )
}
