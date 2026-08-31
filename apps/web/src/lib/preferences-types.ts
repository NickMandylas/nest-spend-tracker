export type AccountPreference = {
  accountId: string
  displayName: string
  providerName: string
  accountType: string
  institutionName: string
  institutionLogo: string | null
  propertyId: string | null
}

export type PropertyPreference = {
  id: string
  displayName: string
  propertyType: string
  address: string
  addressLine1: string
  suburb: string
  state: string
  postcode: string
  country: string
  purchasePriceMinor: number | null
  purchaseDate: string | null
  currentValueMinor: number | null
  valuedAt: string | null
  valuationSource: string | null
}

export type HouseholdMemberPreference = {
  id: string
  displayName: string
  monthlyTakeHomeIncomeMinor: number
  sortOrder: number
}

export type HouseholdPreference = {
  members: HouseholdMemberPreference[]
  monthlyTakeHomeIncomeMinor: number
}

export type DashboardPreferences = {
  household: HouseholdPreference
  properties: PropertyPreference[]
  primaryProperty: PropertyPreference | null
  accounts: Record<string, AccountPreference>
}

export type MonthlyBudgets = {
  month: string
  total: number | null
  categories: Record<string, number>
}
