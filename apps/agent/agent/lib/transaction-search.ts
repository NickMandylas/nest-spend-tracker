import {
  categoryLabel,
  dateKey,
  minorToAud,
  TIME_ZONE,
  withReadOnlyDatabase,
} from "./database"
import { activeFilter } from "./filters"
import { merchantLabel, merchantMatches } from "./merchant"

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

export type TransactionSearchInput = {
  accountName?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  merchants?: string[]
  query?: string
  status?: string
}

function spendRows(rows: TransactionRow[]) {
  return rows.filter(
    (row) =>
      row.direction.toLowerCase() === "debit" && (row.amountMinor ?? 0) < 0
  )
}

function spendingTotalMinor(rows: TransactionRow[]) {
  return spendRows(rows).reduce(
    (total, row) => total + Math.abs(row.amountMinor ?? 0),
    0
  )
}

function statusBreakdown(rows: TransactionRow[]) {
  const grouped = new Map<string, { amountMinor: number; count: number }>()
  for (const row of spendRows(rows)) {
    const status = row.status.trim().toLowerCase() || "unknown"
    const current = grouped.get(status) ?? { amountMinor: 0, count: 0 }
    current.amountMinor += Math.abs(row.amountMinor ?? 0)
    current.count += 1
    grouped.set(status, current)
  }

  return [...grouped.entries()]
    .map(([status, value]) => ({
      status,
      amountAud: minorToAud(value.amountMinor),
      transactionCount: value.count,
    }))
    .sort((left, right) => (right.amountAud ?? 0) - (left.amountAud ?? 0))
}

export function searchTransactionData(input: TransactionSearchInput) {
  const dateTo = input.dateTo ?? dateKey(new Date())
  const dateFrom =
    input.dateFrom ?? dateKey(new Date(Date.now() - 89 * 24 * 60 * 60 * 1000))
  if (dateFrom > dateTo) {
    throw new Error("dateFrom must be on or before dateTo.")
  }

  return withReadOnlyDatabase((database) => {
    const conditions = ["transactions.date BETWEEN ? AND ?"]
    const parameters: Array<string | number> = [dateFrom, dateTo]
    const accountName = activeFilter(input.accountName)
    const category = activeFilter(input.category)
    const status = activeFilter(input.status)

    if (accountName) {
      conditions.push(
        `LOWER(COALESCE(preferences.display_name, accounts.account_name)) LIKE ?`
      )
      parameters.push(`%${accountName.toLowerCase()}%`)
    }
    if (category) {
      conditions.push(
        `LOWER(COALESCE(
           CASE
             WHEN transactions.custom_category = 'UNCATEGORISED' THEN NULL
             ELSE COALESCE(transactions.custom_category, transactions.provider_category)
           END,
           ''
         )) = ?`
      )
      parameters.push(category.toLowerCase().replace(/\s+/g, "_"))
    }
    if (status) {
      conditions.push(`LOWER(transactions.status) = ?`)
      parameters.push(status.toLowerCase())
    }

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
           CASE
             WHEN transactions.custom_category = 'UNCATEGORISED' THEN NULL
             ELSE COALESCE(transactions.custom_category, transactions.provider_category)
           END AS providerCategory,
           transactions.merchant_name AS merchantName,
           transactions.raw_transaction_json AS rawTransactionJson
         FROM bank_transactions AS transactions
         JOIN connected_accounts AS accounts
           ON accounts.account_id = transactions.account_id
         LEFT JOIN account_preferences AS preferences
           ON preferences.account_id = accounts.account_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY
           COALESCE(transactions.datetime, transactions.post_datetime, transactions.date) DESC`
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

    const requestedMerchants = (input.merchants ?? [])
      .map((merchant) => merchant.trim())
      .filter(Boolean)
    const matchingRows = rows.filter(
      (row) =>
        (!input.query || merchantMatches(row, rules, input.query)) &&
        (requestedMerchants.length === 0 ||
          requestedMerchants.some((merchant) =>
            merchantMatches(row, rules, merchant)
          ))
    )
    const returnedRows = matchingRows.slice(0, input.limit ?? 25)
    const matchingSpendRows = spendRows(matchingRows)

    return {
      dateFrom,
      dateTo,
      timezone: TIME_ZONE,
      requestedMerchants,
      resultCount: returnedRows.length,
      totalMatches: matchingRows.length,
      spendTransactionCount: matchingSpendRows.length,
      truncated: matchingRows.length > returnedRows.length,
      spendTotalAud: minorToAud(spendingTotalMinor(matchingRows)),
      statusBreakdown: statusBreakdown(matchingRows),
      merchantTotals: requestedMerchants.map((merchant) => {
        const merchantRows = matchingRows.filter((row) =>
          merchantMatches(row, rules, merchant)
        )
        return {
          merchant,
          amountAud: minorToAud(spendingTotalMinor(merchantRows)),
          transactionCount: spendRows(merchantRows).length,
          statusBreakdown: statusBreakdown(merchantRows),
        }
      }),
      transactions: returnedRows.map((row) => ({
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
}
