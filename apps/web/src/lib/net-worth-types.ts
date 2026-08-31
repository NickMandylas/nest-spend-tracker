import type { PropertyPreference } from "@/lib/preferences-types"

export type NetWorthItemType = "asset" | "liability"

export type ManualNetWorthItem = {
  id: string
  displayName: string
  itemType: NetWorthItemType
  category: string
  amountMinor: number
  sortOrder: number
}

export type NetWorthProfile = {
  properties: PropertyPreference[]
  items: ManualNetWorthItem[]
  settings: {
    monthlySuperContributionMinor: number
    superContributionTaxBps: number
  }
}

export type NetWorthProfileInput = {
  superAccounts: Array<{
    id: string
    displayName: string
    amountMinor: number
  }>
  monthlySuperContributionMinor: number
  superContributionTaxBps: number
}
