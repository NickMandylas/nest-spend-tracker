import path from "node:path"

import Database from "better-sqlite3"

export const TIME_ZONE = "Australia/Melbourne"

export function withReadOnlyDatabase<T>(
  operation: (database: Database.Database) => T
): T {
  const database = new Database(
    process.env.SPEND_TRACKER_DB_PATH ??
      path.resolve(process.cwd(), "../../data/spend-tracker.sqlite"),
    {
      readonly: true,
      fileMustExist: true,
    }
  )

  database.pragma("query_only = ON")
  database.pragma("busy_timeout = 5000")

  try {
    return operation(database)
  } finally {
    database.close()
  }
}

export function minorToAud(value: number | null | undefined) {
  if (value == null) return null
  return Number((value / 100).toFixed(2))
}

export function categoryLabel(value: string | null | undefined) {
  if (!value) return "Uncategorised"

  const labels: Record<string, string> = {
    BANK_FEES: "Bank fees",
    FOOD_AND_DRINK: "Food & drink",
    FOOD_AND_DRINK_GROCERIES: "Groceries",
    GOVERNMENT_AND_NON_PROFIT: "Government",
    INCOME: "Income",
    LOAN_PAYMENTS: "Property loan",
    MERCHANDISE: "Shopping",
    PERSONAL_CARE: "Personal care",
    SERVICES: "Services",
    TRANSFER_IN: "Transfer in",
    TRANSFER_OUT: "Transfer out",
  }

  return (
    labels[value] ??
    value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  )
}

export function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function currentMonthKey() {
  return dateKey(new Date()).slice(0, 7)
}
