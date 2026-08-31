import { defineTool } from "eve/tools"
import { z } from "zod"

import {
  categoryLabel,
  currentMonthKey,
  dateKey,
  minorToAud,
  TIME_ZONE,
  withReadOnlyDatabase,
} from "../lib/database"
import { merchantLabel } from "../lib/merchant"

type SpendingRow = {
  amountMinor: number
  date: string
  description: string
  merchantName: string | null
  providerCategory: string | null
  rawTransactionJson: string
}

type RuleRow = {
  customName: string | null
  matchKey: string
}

const inputSchema = z.object({
  period: z
    .enum(["current_month", "last_30_days", "last_90_days", "custom"])
    .default("current_month"),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Required for a custom period, in YYYY-MM-DD format."),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Required for a custom period, in YYYY-MM-DD format."),
  groupBy: z.enum(["category", "merchant", "day"]).default("category"),
})

function rangeFor(input: z.infer<typeof inputSchema>) {
  const today = dateKey(new Date())

  if (input.period === "custom") {
    if (!input.dateFrom || !input.dateTo) {
      throw new Error("A custom period requires both dateFrom and dateTo.")
    }
    if (input.dateFrom > input.dateTo) {
      throw new Error("dateFrom must be on or before dateTo.")
    }
    return { dateFrom: input.dateFrom, dateTo: input.dateTo }
  }

  if (input.period === "current_month") {
    return { dateFrom: `${currentMonthKey()}-01`, dateTo: today }
  }

  const days = input.period === "last_30_days" ? 29 : 89
  return {
    dateFrom: dateKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
    dateTo: today,
  }
}

export default defineTool({
  description:
    "Summarise everyday debit spending from the local cache for a standard or custom date range, grouped by category, merchant, or day. Income, transfers, property-loan payments, and settlement drawings are excluded.",
  inputSchema,
  execute(input) {
    const range = rangeFor(input)

    return withReadOnlyDatabase((database) => {
      const rows = database
        .prepare(
          `SELECT
             transactions.date,
             transactions.description,
             transactions.amount_minor AS amountMinor,
             CASE
               WHEN transactions.custom_category = 'UNCATEGORISED' THEN NULL
               ELSE COALESCE(transactions.custom_category, transactions.provider_category)
             END AS providerCategory,
             transactions.merchant_name AS merchantName,
             transactions.raw_transaction_json AS rawTransactionJson
           FROM bank_transactions AS transactions
           JOIN connected_accounts AS accounts
             ON accounts.account_id = transactions.account_id
           WHERE accounts.account_type = 'transaction'
             AND transactions.direction = 'debit'
             AND transactions.amount_minor < 0
             AND transactions.date BETWEEN ? AND ?
             AND COALESCE(
               CASE
                 WHEN transactions.custom_category = 'UNCATEGORISED' THEN NULL
                 ELSE COALESCE(transactions.custom_category, transactions.provider_category)
               END,
               ''
             ) NOT IN (
               'INCOME', 'LOAN_PAYMENTS', 'TRANSFER_IN', 'TRANSFER_OUT'
             )
             AND transactions.description NOT LIKE '%settlement drawing%'
           ORDER BY transactions.date DESC`
        )
        .all(range.dateFrom, range.dateTo) as SpendingRow[]

      const rules = new Map(
        (
          database
            .prepare(
              `SELECT match_key AS matchKey, custom_name AS customName
               FROM merchant_logo_rules`
            )
            .all() as RuleRow[]
        ).map((rule) => [rule.matchKey, rule] as const)
      )

      const grouped = new Map<string, { amountMinor: number; count: number }>()
      for (const row of rows) {
        const label =
          input.groupBy === "day"
            ? row.date
            : input.groupBy === "merchant"
              ? merchantLabel(row, rules)
              : categoryLabel(row.providerCategory)
        const current = grouped.get(label) ?? { amountMinor: 0, count: 0 }
        current.amountMinor += Math.abs(row.amountMinor)
        current.count += 1
        grouped.set(label, current)
      }

      const totalMinor = rows.reduce(
        (total, row) => total + Math.abs(row.amountMinor),
        0
      )
      const groups = [...grouped.entries()]
        .map(([label, value]) => ({
          label,
          amountAud: minorToAud(value.amountMinor),
          transactionCount: value.count,
          sharePercent:
            totalMinor === 0
              ? 0
              : Number(((value.amountMinor / totalMinor) * 100).toFixed(2)),
        }))
        .sort((left, right) =>
          input.groupBy === "day"
            ? left.label.localeCompare(right.label)
            : (right.amountAud ?? 0) - (left.amountAud ?? 0)
        )
        .slice(0, 20)

      const singleMonth =
        range.dateFrom.slice(0, 7) === range.dateTo.slice(0, 7)
          ? range.dateFrom.slice(0, 7)
          : null
      const budgets = singleMonth
        ? (database
            .prepare(
              `SELECT category, amount_minor AS amountMinor
               FROM monthly_budgets
               WHERE month = ?
               ORDER BY category`
            )
            .all(singleMonth) as { amountMinor: number; category: string }[])
        : []

      return {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        timezone: TIME_ZONE,
        groupBy: input.groupBy,
        totalAud: minorToAud(totalMinor),
        transactionCount: rows.length,
        groups,
        budgets: budgets.map((budget) => ({
          category:
            budget.category === "__TOTAL__"
              ? "Total monthly budget"
              : categoryLabel(budget.category),
          amountAud: minorToAud(budget.amountMinor),
        })),
      }
    })
  },
})
