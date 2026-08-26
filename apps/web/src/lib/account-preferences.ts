import "server-only"

import { eq } from "drizzle-orm"

import { getDatabase } from "@/lib/db"
import { accountPreferences, properties } from "@/lib/db/schema"
import type { DashboardPreferences } from "@/lib/preferences-types"
import type { AccountSnapshot } from "@/lib/redbark-types"

export const PRIMARY_PROPERTY_ID = "property_351_moray_st"
export const PRIMARY_PROPERTY_ADDRESS = "351 Moray St"
export const PRIMARY_PROPERTY_FULL_ADDRESS =
  "351 Moray Street, South Melbourne VIC 3205"
export const PRIMARY_PROPERTY_LOAN_NAME = "Property Loan (351 Moray St)"
export const MONTHLY_TAKE_HOME_INCOME_MINOR = 2_549_567

function defaultDisplayName(account: AccountSnapshot["account"]) {
  if (account.type === "loan") return PRIMARY_PROPERTY_LOAN_NAME
  if (account.name.toLowerCase().includes("offset")) return "Offset"
  return account.name
}

export function ensureDashboardPreferences(
  accounts: AccountSnapshot[]
): DashboardPreferences {
  const db = getDatabase()
  const now = new Date()

  db.insert(properties)
    .values({
      id: PRIMARY_PROPERTY_ID,
      displayName: PRIMARY_PROPERTY_ADDRESS,
      address: PRIMARY_PROPERTY_ADDRESS,
      monthlyTakeHomeIncomeMinor: MONTHLY_TAKE_HOME_INCOME_MINOR,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run()

  db.update(properties)
    .set({
      address: PRIMARY_PROPERTY_FULL_ADDRESS,
      monthlyTakeHomeIncomeMinor: MONTHLY_TAKE_HOME_INCOME_MINOR,
      updatedAt: now,
    })
    .where(eq(properties.id, PRIMARY_PROPERTY_ID))
    .run()

  db.transaction((transaction) => {
    accounts.forEach(({ account }) => {
      transaction
        .insert(accountPreferences)
        .values({
          accountId: account.id,
          displayName: defaultDisplayName(account),
          providerName: account.name,
          accountType: account.type,
          institutionName: account.institution.name,
          institutionLogo: account.institution.logo,
          propertyId: account.type === "loan" ? PRIMARY_PROPERTY_ID : null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: accountPreferences.accountId,
          set: {
            providerName: account.name,
            accountType: account.type,
            institutionName: account.institution.name,
            institutionLogo: account.institution.logo,
            updatedAt: now,
          },
        })
        .run()
    })
  })

  const property = db
    .select()
    .from(properties)
    .where(eq(properties.id, PRIMARY_PROPERTY_ID))
    .get()
  const rows = db.select().from(accountPreferences).all()

  return {
    property: {
      id: property?.id ?? PRIMARY_PROPERTY_ID,
      displayName: property?.displayName ?? PRIMARY_PROPERTY_ADDRESS,
      address: property?.address ?? PRIMARY_PROPERTY_ADDRESS,
      monthlyTakeHomeIncomeMinor:
        property?.monthlyTakeHomeIncomeMinor ?? MONTHLY_TAKE_HOME_INCOME_MINOR,
    },
    accounts: Object.fromEntries(
      rows.map((row) => [
        row.accountId,
        {
          accountId: row.accountId,
          displayName: row.displayName,
          providerName: row.providerName,
          accountType: row.accountType,
          institutionName: row.institutionName,
          institutionLogo: row.institutionLogo,
          propertyId: row.propertyId,
        },
      ])
    ),
  }
}

export function renameConnectedAccount(accountId: string, displayName: string) {
  const result = getDatabase()
    .update(accountPreferences)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(accountPreferences.accountId, accountId))
    .run()

  return result.changes > 0
}
