import "server-only"

import { ensureDashboardPreferences } from "@/lib/account-preferences"
import {
  getCachedFinancialSnapshot,
  synchroniseFinancialSnapshot,
} from "@/lib/banking-cache"
import { getMonthlyBudgets } from "@/lib/budgets"
import { getDateKeyInTimeZone } from "@/lib/finance"
import { applyMerchantLogoRules } from "@/lib/merchant-logo-rules"
import {
  getPublicDemoDashboard,
  isPublicDemoMode,
} from "@/lib/public-demo-data"

export async function loadDashboardSnapshot() {
  if (isPublicDemoMode()) {
    return { ...getPublicDemoDashboard(), error: null }
  }

  try {
    const storedSnapshot =
      getCachedFinancialSnapshot() ?? (await synchroniseFinancialSnapshot())
    const snapshot = applyMerchantLogoRules(storedSnapshot)

    const preferences = ensureDashboardPreferences(snapshot.accounts)
    const month = getDateKeyInTimeZone(
      new Date(snapshot.fetchedAt),
      snapshot.timezone
    ).slice(0, 7)
    const budgets = getMonthlyBudgets(month)

    return { snapshot, preferences, budgets, error: null }
  } catch (error) {
    return { snapshot: null, preferences: null, budgets: null, error }
  }
}
