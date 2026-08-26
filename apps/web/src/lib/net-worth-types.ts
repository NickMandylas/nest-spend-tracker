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
  property: {
    id: string
    displayName: string
    address: string
    valueMinor: number
    valuedAt: string
    source: string
  }
  items: ManualNetWorthItem[]
  settings: {
    monthlySuperContributionMinor: number
    superContributionTaxBps: number
  }
}

export type NetWorthProfileInput = {
  propertyValueMinor: number
  propertyValuedAt: string
  superAccounts: Array<{
    id: string
    displayName: string
    amountMinor: number
  }>
  monthlySuperContributionMinor: number
  superContributionTaxBps: number
}
