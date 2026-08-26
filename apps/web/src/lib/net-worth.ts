import "server-only"

import { asc, eq } from "drizzle-orm"

import {
  PRIMARY_PROPERTY_FULL_ADDRESS,
  PRIMARY_PROPERTY_ID,
} from "@/lib/account-preferences"
import { getDatabase } from "@/lib/db"
import {
  manualNetWorthItems,
  netWorthSettings,
  properties,
  propertyValuations,
} from "@/lib/db/schema"
import type {
  NetWorthItemType,
  NetWorthProfile,
  NetWorthProfileInput,
} from "@/lib/net-worth-types"

const HOUSEHOLD_SETTINGS_ID = "household"
const PRIMARY_PROPERTY_VALUATION_ID = "valuation_351_moray_st"

const DEFAULT_PROPERTY_VALUE_MINOR = 121_200_000
const DEFAULT_PROPERTY_LOAN_BALANCE_MINOR = 95_621_400
const DEFAULT_VALUED_AT = "2026-08-25"
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

  db.insert(propertyValuations)
    .values({
      id: PRIMARY_PROPERTY_VALUATION_ID,
      propertyId: PRIMARY_PROPERTY_ID,
      valueMinor: DEFAULT_PROPERTY_VALUE_MINOR,
      loanBalanceMinor: DEFAULT_PROPERTY_LOAN_BALANCE_MINOR,
      valuedAt: DEFAULT_VALUED_AT,
      source: "Owner estimate",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run()

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
  const property = db
    .select()
    .from(properties)
    .where(eq(properties.id, PRIMARY_PROPERTY_ID))
    .get()
  const valuation = db
    .select()
    .from(propertyValuations)
    .where(eq(propertyValuations.propertyId, PRIMARY_PROPERTY_ID))
    .get()
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
    property: {
      id: property?.id ?? PRIMARY_PROPERTY_ID,
      displayName: property?.displayName ?? "351 Moray St",
      address: property?.address ?? PRIMARY_PROPERTY_FULL_ADDRESS,
      valueMinor: valuation?.valueMinor ?? DEFAULT_PROPERTY_VALUE_MINOR,
      valuedAt: valuation?.valuedAt ?? DEFAULT_VALUED_AT,
      source: valuation?.source ?? "Owner estimate",
    },
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
  const existingValuation = db
    .select({ loanBalanceMinor: propertyValuations.loanBalanceMinor })
    .from(propertyValuations)
    .where(eq(propertyValuations.propertyId, PRIMARY_PROPERTY_ID))
    .get()

  db.transaction((transaction) => {
    transaction
      .insert(propertyValuations)
      .values({
        id: PRIMARY_PROPERTY_VALUATION_ID,
        propertyId: PRIMARY_PROPERTY_ID,
        valueMinor: input.propertyValueMinor,
        // Kept only because the legacy valuation table still requires it. The
        // net worth page reads the linked bank account balance instead.
        loanBalanceMinor:
          existingValuation?.loanBalanceMinor ??
          DEFAULT_PROPERTY_LOAN_BALANCE_MINOR,
        valuedAt: input.propertyValuedAt,
        source: "Owner estimate",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: propertyValuations.propertyId,
        set: {
          valueMinor: input.propertyValueMinor,
          valuedAt: input.propertyValuedAt,
          source: "Owner estimate",
          updatedAt: now,
        },
      })
      .run()

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
