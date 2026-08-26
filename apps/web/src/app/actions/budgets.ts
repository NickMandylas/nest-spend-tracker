"use server"

import { revalidatePath } from "next/cache"

import { saveMonthlyBudgets } from "@/lib/budgets"
import type { MonthlyBudgets } from "@/lib/preferences-types"

export type SaveBudgetsResult =
  { ok: true; budgets: MonthlyBudgets } | { ok: false; message: string }

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const MAX_BUDGET_MINOR = 100_000_000_00

function parseAmount(value: FormDataEntryValue | null) {
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "")
  if (!cleaned) return null

  const dollars = Number(cleaned)
  if (!Number.isFinite(dollars) || dollars < 0) return Number.NaN
  return Math.round(dollars * 100)
}

export async function updateMonthlyBudgets(
  formData: FormData
): Promise<SaveBudgetsResult> {
  const month = String(formData.get("month") ?? "")
  if (!MONTH_PATTERN.test(month)) {
    return { ok: false, message: "This budget month is not valid." }
  }

  const total = parseAmount(formData.get("total"))
  const categories: Record<string, number> = {}

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("category:")) continue

    const category = key.slice("category:".length)
    if (!category || category.length > 120) {
      return { ok: false, message: "One of the budget categories is invalid." }
    }

    const amount = parseAmount(value)
    if (Number.isNaN(amount)) {
      return { ok: false, message: "Enter budget amounts in dollars." }
    }
    categories[category] = amount ?? 0
  }

  const amounts = [total, ...Object.values(categories)].filter(
    (amount): amount is number => amount !== null
  )
  if (amounts.some((amount) => amount < 0 || amount > MAX_BUDGET_MINOR)) {
    return {
      ok: false,
      message: "Use budget amounts between $0 and $100 million.",
    }
  }

  const budgets = saveMonthlyBudgets({ month, total, categories })

  revalidatePath("/")
  revalidatePath("/activity")
  revalidatePath("/forecast")
  revalidatePath("/dashboard")

  return { ok: true, budgets }
}
