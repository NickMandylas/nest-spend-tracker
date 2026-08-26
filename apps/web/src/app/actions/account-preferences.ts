"use server"

import { revalidatePath } from "next/cache"

import { renameConnectedAccount } from "@/lib/account-preferences"

export type RenameAccountResult =
  { ok: true; displayName: string } | { ok: false; message: string }

export async function renameAccount(
  formData: FormData
): Promise<RenameAccountResult> {
  const accountId = String(formData.get("accountId") ?? "").trim()
  const displayName = String(formData.get("displayName") ?? "")
    .replace(/\s+/g, " ")
    .trim()

  if (!accountId) {
    return { ok: false, message: "This account could not be identified." }
  }

  if (displayName.length < 2 || displayName.length > 64) {
    return {
      ok: false,
      message: "Use an account name between 2 and 64 characters.",
    }
  }

  if (!renameConnectedAccount(accountId, displayName)) {
    return { ok: false, message: "This connected account was not found." }
  }

  revalidatePath("/")
  revalidatePath("/activity")
  revalidatePath("/net-worth")
  revalidatePath("/forecast")

  return { ok: true, displayName }
}
