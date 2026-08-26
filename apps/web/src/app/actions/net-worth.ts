"use server"

import { revalidatePath } from "next/cache"

import { saveNetWorthProfile } from "@/lib/net-worth"
import type { NetWorthProfile } from "@/lib/net-worth-types"

export type SaveNetWorthResult =
  { ok: true; profile: NetWorthProfile } | { ok: false; message: string }

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/
const SUPER_ACCOUNT_IDS = ["super_account_1", "super_account_2"] as const
const MAX_MONEY_MINOR = 100_000_000_000

function parseMoney(value: FormDataEntryValue | null) {
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "")
  const dollars = Number(cleaned)

  if (!cleaned || !Number.isFinite(dollars) || dollars < 0) return Number.NaN
  return Math.round(dollars * 100)
}

export async function updateNetWorthProfile(
  formData: FormData
): Promise<SaveNetWorthResult> {
  const propertyValueMinor = parseMoney(formData.get("propertyValue"))
  const monthlySuperContributionMinor = parseMoney(
    formData.get("monthlySuperContribution")
  )
  const propertyValuedAt = String(formData.get("propertyValuedAt") ?? "")
  const taxPercent = Number(formData.get("superContributionTaxPercent"))

  const moneyValues = [propertyValueMinor, monthlySuperContributionMinor]

  if (
    moneyValues.some(
      (amount) =>
        !Number.isFinite(amount) || amount < 0 || amount > MAX_MONEY_MINOR
    )
  ) {
    return {
      ok: false,
      message: "Enter valid amounts between $0 and $1 billion.",
    }
  }

  if (!DATE_PATTERN.test(propertyValuedAt)) {
    return { ok: false, message: "Choose a valid valuation date." }
  }

  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 45) {
    return {
      ok: false,
      message: "Use a contribution tax rate between 0% and 45%.",
    }
  }

  const superAccounts = SUPER_ACCOUNT_IDS.map((id) => ({
    id,
    displayName: String(formData.get(`superName:${id}`) ?? "").trim(),
    amountMinor: parseMoney(formData.get(`superBalance:${id}`)),
  }))

  if (
    superAccounts.some(
      (account) =>
        !account.displayName ||
        account.displayName.length > 80 ||
        !Number.isFinite(account.amountMinor) ||
        account.amountMinor < 0 ||
        account.amountMinor > MAX_MONEY_MINOR
    )
  ) {
    return {
      ok: false,
      message: "Add a short name and valid balance for each super account.",
    }
  }

  const profile = saveNetWorthProfile({
    propertyValueMinor,
    propertyValuedAt,
    superAccounts,
    monthlySuperContributionMinor,
    superContributionTaxBps: Math.round(taxPercent * 100),
  })

  revalidatePath("/net-worth")

  return { ok: true, profile }
}
