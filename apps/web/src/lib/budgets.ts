import "server-only"

import { and, eq } from "drizzle-orm"

import { getDatabase } from "@/lib/db"
import { monthlyBudgets } from "@/lib/db/schema"
import type { MonthlyBudgets } from "@/lib/preferences-types"

export const TOTAL_BUDGET_CATEGORY = "__TOTAL__"

function budgetId(month: string, category: string) {
  return `${month}:${category}`
}

export function getMonthlyBudgets(month: string): MonthlyBudgets {
  const rows = getDatabase()
    .select()
    .from(monthlyBudgets)
    .where(eq(monthlyBudgets.month, month))
    .all()

  const total = rows.find(
    (row) => row.category === TOTAL_BUDGET_CATEGORY
  )?.amountMinor

  return {
    month,
    total: total ?? null,
    categories: Object.fromEntries(
      rows
        .filter((row) => row.category !== TOTAL_BUDGET_CATEGORY)
        .map((row) => [row.category, row.amountMinor])
    ),
  }
}

export function saveMonthlyBudgets({
  month,
  total,
  categories,
}: MonthlyBudgets) {
  const db = getDatabase()
  const now = new Date()

  db.transaction((transaction) => {
    const entries = [
      [TOTAL_BUDGET_CATEGORY, total] as const,
      ...Object.entries(categories),
    ]

    entries.forEach(([category, amountMinor]) => {
      if (!amountMinor || amountMinor <= 0) {
        transaction
          .delete(monthlyBudgets)
          .where(
            and(
              eq(monthlyBudgets.month, month),
              eq(monthlyBudgets.category, category)
            )
          )
          .run()
        return
      }

      transaction
        .insert(monthlyBudgets)
        .values({
          id: budgetId(month, category),
          month,
          category,
          amountMinor,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: monthlyBudgets.id,
          set: { amountMinor, updatedAt: now },
        })
        .run()
    })
  })

  return getMonthlyBudgets(month)
}
