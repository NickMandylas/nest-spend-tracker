"use server"

import { revalidatePath } from "next/cache"

import { synchroniseFinancialSnapshot } from "@/lib/banking-cache"

export type SyncBankingDataResult =
  { ok: true; fetchedAt: string } | { ok: false; message: string }

export async function syncBankingData(): Promise<SyncBankingDataResult> {
  try {
    const snapshot = await synchroniseFinancialSnapshot()

    revalidatePath("/")
    revalidatePath("/activity")
    revalidatePath("/net-worth")
    revalidatePath("/forecast")
    revalidatePath("/dashboard")

    return { ok: true, fetchedAt: snapshot.fetchedAt }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Banking data could not be refreshed.",
    }
  }
}
