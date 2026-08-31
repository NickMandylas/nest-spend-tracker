"use server"

import { revalidatePath } from "next/cache"

import {
  deleteHouseholdMember as deleteStoredHouseholdMember,
  getHouseholdPreference,
  saveHouseholdMember as saveStoredHouseholdMember,
} from "@/lib/account-preferences"
import type {
  HouseholdMemberPreference,
  HouseholdPreference,
} from "@/lib/preferences-types"

const MAX_INCOME_MINOR = 100_000_000_000

export type SaveHouseholdMemberResult =
  | {
      ok: true
      member: HouseholdMemberPreference
      household: HouseholdPreference
    }
  | { ok: false; message: string }

export type DeleteHouseholdMemberResult =
  | { ok: true; memberId: string; household: HouseholdPreference }
  | { ok: false; message: string }

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function revalidateHousehold() {
  revalidatePath("/")
  revalidatePath("/dashboard")
  revalidatePath("/forecast")
  revalidatePath("/settings")
}

export async function saveHouseholdMember(
  formData: FormData
): Promise<SaveHouseholdMemberResult> {
  const id = field(formData, "memberId") || undefined
  const displayName = field(formData, "displayName")
  const rawIncome = field(formData, "monthlyTakeHomeIncome").replace(
    /[$,\s]/g,
    ""
  )
  const monthlyTakeHomeIncomeMinor = Math.round(Number(rawIncome) * 100)

  if (displayName.length < 2 || displayName.length > 80) {
    return { ok: false, message: "Use a name between 2 and 80 characters." }
  }
  if (
    !rawIncome ||
    !Number.isFinite(monthlyTakeHomeIncomeMinor) ||
    monthlyTakeHomeIncomeMinor < 0 ||
    monthlyTakeHomeIncomeMinor > MAX_INCOME_MINOR
  ) {
    return {
      ok: false,
      message: "Enter a monthly amount between $0 and $1 billion.",
    }
  }

  const member = saveStoredHouseholdMember({
    id,
    displayName,
    monthlyTakeHomeIncomeMinor,
  })
  if (!member) {
    return { ok: false, message: "This person could not be saved." }
  }

  revalidateHousehold()
  return { ok: true, member, household: getHouseholdPreference() }
}

export async function deleteHouseholdMember(
  formData: FormData
): Promise<DeleteHouseholdMemberResult> {
  const memberId = field(formData, "memberId")
  if (!memberId) {
    return { ok: false, message: "This person could not be identified." }
  }
  if (!deleteStoredHouseholdMember(memberId)) {
    return { ok: false, message: "This person was not found." }
  }

  revalidateHousehold()
  return { ok: true, memberId, household: getHouseholdPreference() }
}
