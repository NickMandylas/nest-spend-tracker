export type AccountPreference = {
  accountId: string
  displayName: string
  providerName: string
  accountType: string
  institutionName: string
  institutionLogo: string | null
  propertyId: string | null
}

export type DashboardPreferences = {
  property: {
    id: string
    displayName: string
    address: string
    monthlyTakeHomeIncomeMinor: number
  }
  accounts: Record<string, AccountPreference>
}

export type MonthlyBudgets = {
  month: string
  total: number | null
  categories: Record<string, number>
}
