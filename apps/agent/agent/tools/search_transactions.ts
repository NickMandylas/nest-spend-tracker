import { defineTool } from "eve/tools"
import { z } from "zod"

import {
  categoryLabel,
  dateKey,
  minorToAud,
  TIME_ZONE,
  withReadOnlyDatabase,
} from "../lib/database"
import { merchantLabel } from "../lib/merchant"

type TransactionRow = {
  accountName: string
  amountMinor: number | null
  currency: string | null
  date: string
  datetime: string | null
  description: string
  direction: string
  merchantName: string | null
  postDatetime: string | null
  providerCategory: string | null
  rawTransactionJson: string
  status: string
}

type RuleRow = {
  customName: string | null
  matchKey: string
}

export default defineTool({
  description:
    "Search cached bank transactions by text, account name, category, status, and date range. Returns safe display fields only, with custom merchant names applied.",
  inputSchema: z.object({
    query: z.string().trim().min(1).optional(),
    accountName: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  execute(input) {
    const dateTo = input.dateTo ?? dateKey(new Date())
    const dateFrom =
      input.dateFrom ?? dateKey(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000))
    if (dateFrom > dateTo) {
      throw new Error("dateFrom must be on or before dateTo.")
    }

    return withReadOnlyDatabase((database) => {
      const conditions = ["transactions.date BETWEEN ? AND ?"]
      const parameters: Array<string | number> = [dateFrom, dateTo]

      if (input.query) {
        conditions.push(
          `(LOWER(transactions.description) LIKE ? OR LOWER(COALESCE(transactions.merchant_name, '')) LIKE ?)`
        )
        const query = `%${input.query.toLowerCase()}%`
        parameters.push(query, query)
      }
      if (input.accountName) {
        conditions.push(
          `LOWER(COALESCE(preferences.display_name, accounts.account_name)) LIKE ?`
        )
        parameters.push(`%${input.accountName.toLowerCase()}%`)
      }
      if (input.category) {
        conditions.push(
          `LOWER(COALESCE(transactions.provider_category, '')) = ?`
        )
        parameters.push(input.category.toLowerCase().replace(/\s+/g, "_"))
      }
      if (input.status) {
        conditions.push(`LOWER(transactions.status) = ?`)
        parameters.push(input.status.toLowerCase())
      }
      parameters.push(input.limit)

      const rows = database
        .prepare(
          `SELECT
             COALESCE(preferences.display_name, accounts.account_name) AS accountName,
             transactions.status,
             transactions.date,
             transactions.datetime,
             transactions.post_datetime AS postDatetime,
             transactions.description,
             transactions.amount_minor AS amountMinor,
             transactions.currency,
             transactions.direction,
             transactions.provider_category AS providerCategory,
             transactions.merchant_name AS merchantName,
             transactions.raw_transaction_json AS rawTransactionJson
           FROM bank_transactions AS transactions
           JOIN connected_accounts AS accounts
             ON accounts.account_id = transactions.account_id
           LEFT JOIN account_preferences AS preferences
             ON preferences.account_id = accounts.account_id
           WHERE ${conditions.join(" AND ")}
           ORDER BY
             COALESCE(transactions.datetime, transactions.post_datetime, transactions.date) DESC
           LIMIT ?`
        )
        .all(...parameters) as TransactionRow[]

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

      return {
        dateFrom,
        dateTo,
        timezone: TIME_ZONE,
        resultCount: rows.length,
        transactions: rows.map((row) => ({
          merchant: merchantLabel(row, rules),
          description: row.description,
          account: row.accountName,
          amountAud: minorToAud(row.amountMinor),
          currency: (row.currency ?? "AUD").toUpperCase(),
          direction: row.direction,
          category: categoryLabel(row.providerCategory),
          status: row.status,
          date: row.date,
          datetime: row.datetime ?? row.postDatetime,
        })),
      }
    })
  },
})
