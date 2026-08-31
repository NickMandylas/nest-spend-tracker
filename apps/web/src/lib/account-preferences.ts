import "server-only"

import { randomUUID } from "node:crypto"
import { asc, eq, sql } from "drizzle-orm"

import { getDatabase } from "@/lib/db"
import {
  accountPreferences,
  householdMembers,
  properties,
  propertyValuations,
} from "@/lib/db/schema"
import type {
  DashboardPreferences,
  PropertyPreference,
} from "@/lib/preferences-types"
import type { AccountSnapshot } from "@/lib/redbark-types"

export type PropertyDetailsInput = {
  id?: string
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

export function getHouseholdPreference() {
  const members = getDatabase()
    .select({
      id: householdMembers.id,
      displayName: householdMembers.displayName,
      monthlyTakeHomeIncomeMinor: householdMembers.monthlyTakeHomeIncomeMinor,
      sortOrder: householdMembers.sortOrder,
    })
    .from(householdMembers)
    .orderBy(asc(householdMembers.sortOrder), asc(householdMembers.createdAt))
    .all()

  return {
    members,
    monthlyTakeHomeIncomeMinor: members.reduce(
      (total, member) => total + member.monthlyTakeHomeIncomeMinor,
      0
    ),
  }
}

function defaultDisplayName(account: AccountSnapshot["account"]) {
  if (account.name.toLowerCase().includes("offset")) return "Offset"
  return account.name
}

function structuredAddress(property: typeof properties.$inferSelect) {
  if (
    property.addressLine1 &&
    (property.suburb ||
      property.state ||
      property.postcode ||
      property.addressLine1 !== property.address)
  ) {
    return {
      addressLine1: property.addressLine1,
      suburb: property.suburb ?? "",
      state: property.state ?? "",
      postcode: property.postcode ?? "",
    }
  }

  const australianAddress = property.address.match(
    /^(.+?),\s*([^,]+?)\s+(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\s+(\d{4})(?:,\s*Australia)?$/i
  )

  return {
    addressLine1:
      australianAddress?.[1] ?? property.addressLine1 ?? property.address,
    suburb: australianAddress?.[2] ?? property.suburb ?? "",
    state: australianAddress?.[3]?.toUpperCase() ?? property.state ?? "",
    postcode: australianAddress?.[4] ?? property.postcode ?? "",
  }
}

export function getStoredProperties(): PropertyPreference[] {
  return getDatabase()
    .select({ property: properties, valuation: propertyValuations })
    .from(properties)
    .leftJoin(
      propertyValuations,
      eq(propertyValuations.propertyId, properties.id)
    )
    .orderBy(asc(properties.createdAt))
    .all()
    .map(({ property, valuation }) => {
      const location = structuredAddress(property)

      return {
        id: property.id,
        displayName: property.displayName,
        propertyType: property.propertyType,
        address: property.address,
        ...location,
        country: property.country,
        purchasePriceMinor: property.purchasePriceMinor,
        purchaseDate: property.purchaseDate,
        currentValueMinor: valuation?.valueMinor ?? null,
        valuedAt: valuation?.valuedAt ?? null,
        valuationSource: valuation?.source ?? null,
      }
    })
}

export function ensureDashboardPreferences(
  accounts: AccountSnapshot[]
): DashboardPreferences {
  const db = getDatabase()
  const now = new Date()

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
          propertyId: null,
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

  const propertyRows = getStoredProperties()
  const accountRows = db.select().from(accountPreferences).all()
  const preferenceByAccount = new Map(
    accountRows.map((row) => [row.accountId, row])
  )
  const linkedPrimaryId = accounts.find(({ account }) => {
    const preference = preferenceByAccount.get(account.id)
    return account.type === "loan" && preference?.propertyId
  })?.account.id
  const primaryPropertyId = linkedPrimaryId
    ? preferenceByAccount.get(linkedPrimaryId)?.propertyId
    : null
  const primaryProperty =
    propertyRows.find((property) => property.id === primaryPropertyId) ??
    propertyRows[0] ??
    null

  return {
    household: getHouseholdPreference(),
    properties: propertyRows,
    primaryProperty,
    accounts: Object.fromEntries(
      accountRows.map((row) => [
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

export function savePropertyDetails(input: PropertyDetailsInput) {
  const db = getDatabase()
  const now = new Date()
  const propertyId = input.id ?? `property_${randomUUID()}`
  const existingValuation = db
    .select({ loanBalanceMinor: propertyValuations.loanBalanceMinor })
    .from(propertyValuations)
    .where(eq(propertyValuations.propertyId, propertyId))
    .get()

  db.transaction((transaction) => {
    transaction
      .insert(properties)
      .values({
        id: propertyId,
        displayName: input.displayName,
        propertyType: input.propertyType,
        address: input.address,
        addressLine1: input.addressLine1,
        suburb: input.suburb || null,
        state: input.state || null,
        postcode: input.postcode || null,
        country: input.country,
        purchasePriceMinor: input.purchasePriceMinor,
        purchaseDate: input.purchaseDate,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: properties.id,
        set: {
          displayName: input.displayName,
          propertyType: input.propertyType,
          address: input.address,
          addressLine1: input.addressLine1,
          suburb: input.suburb || null,
          state: input.state || null,
          postcode: input.postcode || null,
          country: input.country,
          purchasePriceMinor: input.purchasePriceMinor,
          purchaseDate: input.purchaseDate,
          updatedAt: now,
        },
      })
      .run()

    if (input.currentValueMinor !== null && input.valuedAt) {
      transaction
        .insert(propertyValuations)
        .values({
          id: `valuation_${propertyId}`,
          propertyId,
          valueMinor: input.currentValueMinor,
          loanBalanceMinor: existingValuation?.loanBalanceMinor ?? 0,
          valuedAt: input.valuedAt,
          source: input.valuationSource || "Owner estimate",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: propertyValuations.propertyId,
          set: {
            valueMinor: input.currentValueMinor,
            valuedAt: input.valuedAt,
            source: input.valuationSource || "Owner estimate",
            updatedAt: now,
          },
        })
        .run()
    }
  })

  return (
    getStoredProperties().find((property) => property.id === propertyId) ?? null
  )
}

export function saveHouseholdMember(input: {
  id?: string
  displayName: string
  monthlyTakeHomeIncomeMinor: number
}) {
  const db = getDatabase()
  const now = new Date()
  const memberId = input.id ?? `household_member_${randomUUID()}`
  const sortOrder = input.id
    ? undefined
    : (db
        .select({
          value: sql<number>`coalesce(max(${householdMembers.sortOrder}), -1)`,
        })
        .from(householdMembers)
        .get()?.value ?? -1) + 1

  db.insert(householdMembers)
    .values({
      id: memberId,
      displayName: input.displayName,
      monthlyTakeHomeIncomeMinor: input.monthlyTakeHomeIncomeMinor,
      sortOrder: sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: householdMembers.id,
      set: {
        displayName: input.displayName,
        monthlyTakeHomeIncomeMinor: input.monthlyTakeHomeIncomeMinor,
        updatedAt: now,
      },
    })
    .run()

  return getHouseholdPreference().members.find(
    (member) => member.id === memberId
  )
}

export function deleteHouseholdMember(memberId: string) {
  return (
    getDatabase()
      .delete(householdMembers)
      .where(eq(householdMembers.id, memberId))
      .run().changes > 0
  )
}

export function deletePropertyDetails(propertyId: string) {
  const db = getDatabase()
  const property = db
    .select({ displayName: properties.displayName })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .get()
  if (!property) return null

  const linkedAccountCount =
    db
      .select({ value: sql<number>`count(*)` })
      .from(accountPreferences)
      .where(eq(accountPreferences.propertyId, propertyId))
      .get()?.value ?? 0

  db.delete(properties).where(eq(properties.id, propertyId)).run()

  return { displayName: property.displayName, linkedAccountCount }
}

export function assignAccountToProperty(
  accountId: string,
  propertyId: string | null
) {
  const db = getDatabase()

  if (propertyId) {
    const property = db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .get()
    if (!property) return false
  }

  const result = db
    .update(accountPreferences)
    .set({ propertyId, updatedAt: new Date() })
    .where(eq(accountPreferences.accountId, accountId))
    .run()

  return result.changes > 0
}

export function renameConnectedAccount(accountId: string, displayName: string) {
  const result = getDatabase()
    .update(accountPreferences)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(accountPreferences.accountId, accountId))
    .run()

  return result.changes > 0
}
