"use server"

import { revalidatePath } from "next/cache"

import {
  assignAccountToProperty,
  deletePropertyDetails,
  savePropertyDetails,
} from "@/lib/account-preferences"
import type { PropertyPreference } from "@/lib/preferences-types"

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/
const PROPERTY_TYPES = new Set([
  "residential",
  "apartment",
  "townhouse",
  "land",
  "commercial",
  "other",
])
const MAX_MONEY_MINOR = 100_000_000_000

export type SavePropertyResult =
  { ok: true; property: PropertyPreference } | { ok: false; message: string }

export type AssignPropertyResult =
  | { ok: true; accountId: string; propertyId: string | null }
  | { ok: false; message: string }

export type DeletePropertyResult =
  | {
      ok: true
      propertyId: string
      displayName: string
      unlinkedAccountCount: number
    }
  | { ok: false; message: string }

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function optionalMoney(formData: FormData, name: string) {
  const raw = field(formData, name).replace(/[$,\s]/g, "")
  if (!raw) return null
  const dollars = Number(raw)
  if (!Number.isFinite(dollars) || dollars < 0) return Number.NaN
  return Math.round(dollars * 100)
}

function revalidateHousehold() {
  revalidatePath("/")
  revalidatePath("/dashboard")
  revalidatePath("/forecast")
  revalidatePath("/net-worth")
  revalidatePath("/settings")
}

export async function saveProperty(
  formData: FormData
): Promise<SavePropertyResult> {
  const id = field(formData, "propertyId") || undefined
  const displayName = field(formData, "displayName")
  const propertyType = field(formData, "propertyType") || "residential"
  const addressLine1 = field(formData, "addressLine1")
  const suburb = field(formData, "suburb")
  const state = field(formData, "state").toUpperCase()
  const postcode = field(formData, "postcode")
  const country = field(formData, "country") || "Australia"
  const purchasePriceMinor = optionalMoney(formData, "purchasePrice")
  const currentValueMinor = optionalMoney(formData, "currentValue")
  const purchaseDate = field(formData, "purchaseDate") || null
  const valuedAt = field(formData, "valuedAt") || null
  const valuationSource = field(formData, "valuationSource") || null

  if (displayName.length < 2 || displayName.length > 80) {
    return {
      ok: false,
      message: "Use a property name between 2 and 80 characters.",
    }
  }
  if (!PROPERTY_TYPES.has(propertyType)) {
    return { ok: false, message: "Choose a valid property type." }
  }
  if (addressLine1.length < 3 || addressLine1.length > 120) {
    return { ok: false, message: "Add a valid street address." }
  }
  if (suburb.length > 80 || state.length > 24 || postcode.length > 12) {
    return { ok: false, message: "Keep the location fields concise." }
  }
  if (!country || country.length > 80) {
    return { ok: false, message: "Add a valid country." }
  }
  if (
    [purchasePriceMinor, currentValueMinor].some(
      (amount) =>
        amount !== null &&
        (!Number.isFinite(amount) || amount < 0 || amount > MAX_MONEY_MINOR)
    )
  ) {
    return {
      ok: false,
      message: "Enter valid amounts between $0 and $1 billion.",
    }
  }
  if (purchaseDate && !DATE_PATTERN.test(purchaseDate)) {
    return { ok: false, message: "Choose a valid purchase date." }
  }
  if (valuedAt && !DATE_PATTERN.test(valuedAt)) {
    return { ok: false, message: "Choose a valid valuation date." }
  }
  if ((currentValueMinor === null) !== (valuedAt === null)) {
    return {
      ok: false,
      message:
        "Add both a current value and valuation date, or leave both blank.",
    }
  }

  const locality = [suburb, state, postcode].filter(Boolean).join(" ")
  const address = [addressLine1, locality, country].filter(Boolean).join(", ")
  const property = savePropertyDetails({
    id,
    displayName,
    propertyType,
    address,
    addressLine1,
    suburb,
    state,
    postcode,
    country,
    purchasePriceMinor,
    purchaseDate,
    currentValueMinor,
    valuedAt,
    valuationSource,
  })

  if (!property) {
    return { ok: false, message: "The property could not be saved." }
  }

  revalidateHousehold()
  return { ok: true, property }
}

export async function deleteProperty(
  formData: FormData
): Promise<DeletePropertyResult> {
  const propertyId = field(formData, "propertyId")
  if (!propertyId) {
    return { ok: false, message: "This property could not be identified." }
  }

  const deleted = deletePropertyDetails(propertyId)
  if (!deleted) {
    return { ok: false, message: "The property was not found." }
  }

  revalidateHousehold()
  return {
    ok: true,
    propertyId,
    displayName: deleted.displayName,
    unlinkedAccountCount: deleted.linkedAccountCount,
  }
}

export async function setAccountProperty(
  formData: FormData
): Promise<AssignPropertyResult> {
  const accountId = field(formData, "accountId")
  const rawPropertyId = field(formData, "propertyId")
  const propertyId =
    rawPropertyId && rawPropertyId !== "unlinked" ? rawPropertyId : null

  if (!accountId) {
    return { ok: false, message: "This account could not be identified." }
  }
  if (!assignAccountToProperty(accountId, propertyId)) {
    return { ok: false, message: "The account or property was not found." }
  }

  revalidateHousehold()
  return { ok: true, accountId, propertyId }
}
