import "server-only"

import { asc, eq } from "drizzle-orm"

import { getStoredProperties } from "@/lib/account-preferences"
import { getDatabase } from "@/lib/db"
import { manualNetWorthItems, netWorthSettings } from "@/lib/db/schema"
import type {
  NetWorthItemType,
  NetWorthProfile,
  NetWorthProfileInput,
} from "@/lib/net-worth-types"

const HOUSEHOLD_SETTINGS_ID = "household"

const DEFAULT_MONTHLY_SUPER_CONTRIBUTION_MINOR = 450_000
const DEFAULT_SUPER_CONTRIBUTION_TAX_BPS = 1_500

const DEFAULT_SUPER_ACCOUNTS = [
  {
    id: "super_account_1",
    displayName: "Super account 1",
    amountMinor: 9_200_000,
    sortOrder: 10,
  },
  {
    id: "super_account_2",
    displayName: "Super account 2",
    amountMinor: 9_600_000,
    sortOrder: 20,
  },
] as const

function itemType(value: string): NetWorthItemType {
  return value === "liability" ? "liability" : "asset"
}

export function ensureNetWorthProfile() {
  const db = getDatabase()
  const now = new Date()

  db.insert(netWorthSettings)
    .values({
      id: HOUSEHOLD_SETTINGS_ID,
      monthlySuperContributionMinor: DEFAULT_MONTHLY_SUPER_CONTRIBUTION_MINOR,
      superContributionTaxBps: DEFAULT_SUPER_CONTRIBUTION_TAX_BPS,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run()

  db.transaction((transaction) => {
    DEFAULT_SUPER_ACCOUNTS.forEach((account) => {
      transaction
        .insert(manualNetWorthItems)
        .values({
          ...account,
          itemType: "asset",
          category: "superannuation",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .run()
    })
  })
}

export function getNetWorthProfile(): NetWorthProfile {
  ensureNetWorthProfile()

  const db = getDatabase()
  const settings = db
    .select()
    .from(netWorthSettings)
    .where(eq(netWorthSettings.id, HOUSEHOLD_SETTINGS_ID))
    .get()
  const items = db
    .select()
    .from(manualNetWorthItems)
    .orderBy(asc(manualNetWorthItems.sortOrder))
    .all()

  return {
    properties: getStoredProperties(),
    items: items.map((item) => ({
      id: item.id,
      displayName: item.displayName,
      itemType: itemType(item.itemType),
      category: item.category,
      amountMinor: item.amountMinor,
      sortOrder: item.sortOrder,
    })),
    settings: {
      monthlySuperContributionMinor:
        settings?.monthlySuperContributionMinor ??
        DEFAULT_MONTHLY_SUPER_CONTRIBUTION_MINOR,
      superContributionTaxBps:
        settings?.superContributionTaxBps ?? DEFAULT_SUPER_CONTRIBUTION_TAX_BPS,
    },
  }
}

export function saveNetWorthProfile(input: NetWorthProfileInput) {
  const db = getDatabase()
  const now = new Date()

  db.transaction((transaction) => {
    transaction
      .insert(netWorthSettings)
      .values({
        id: HOUSEHOLD_SETTINGS_ID,
        monthlySuperContributionMinor: input.monthlySuperContributionMinor,
        superContributionTaxBps: input.superContributionTaxBps,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: netWorthSettings.id,
        set: {
          monthlySuperContributionMinor: input.monthlySuperContributionMinor,
          superContributionTaxBps: input.superContributionTaxBps,
          updatedAt: now,
        },
      })
      .run()

    input.superAccounts.forEach((account, index) => {
      transaction
        .insert(manualNetWorthItems)
        .values({
          id: account.id,
          displayName: account.displayName,
          itemType: "asset",
          category: "superannuation",
          amountMinor: account.amountMinor,
          sortOrder: (index + 1) * 10,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: manualNetWorthItems.id,
          set: {
            displayName: account.displayName,
            amountMinor: account.amountMinor,
            sortOrder: (index + 1) * 10,
            updatedAt: now,
          },
        })
        .run()
    })
  })

  return getNetWorthProfile()
}
