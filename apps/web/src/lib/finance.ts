import type {
  AccountItem,
  AccountSnapshot,
  Transaction,
} from "@/lib/redbark-types"

const AUD_FORMATTER = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const AUD_WHOLE_FORMATTER = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const COMPACT_AUD_FORMATTER = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  notation: "compact",
  maximumFractionDigits: 1,
})

const CATEGORY_LABELS: Record<string, string> = {
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

const NON_SPEND_CATEGORIES = new Set([
  "INCOME",
  "LOAN_PAYMENTS",
  "TRANSFER_IN",
  "TRANSFER_OUT",
])

export function formatMoney(
  minorUnits: number | null | undefined,
  whole = false
) {
  const amount = (minorUnits ?? 0) / 100
  return (whole ? AUD_WHOLE_FORMATTER : AUD_FORMATTER).format(amount)
}

export function formatCompactMoney(minorUnits: number | null | undefined) {
  return COMPACT_AUD_FORMATTER.format((minorUnits ?? 0) / 100)
}

export function formatCategory(category: string | null) {
  if (!category) return "Uncategorised"
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category]

  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function getMerchantName(transaction: Transaction) {
  const customMerchant = transaction.custom_merchant_name?.trim()
  if (customMerchant) return customMerchant

  const merchant = transaction.merchant_name?.trim()
  if (merchant) return merchant

  const description = transaction.description.replace(/\s+/g, " ").trim()
  const knownMerchant = [
    "Woolworths",
    "Coles",
    "Kmart",
    "Yo-Bar",
    "Dish and Spoon Cafe",
  ].find((name) => description.toLowerCase().includes(name.toLowerCase()))

  if (knownMerchant) return knownMerchant
  if (/settlement drawing/i.test(description)) return "Property settlement"
  if (/annual package fee/i.test(description)) return "Annual package fee"
  if (/loan advance/i.test(description)) return "Loan advance"
  if (/doc proc fee/i.test(description)) return "Document processing fee"

  return description.length > 42
    ? `${description.slice(0, 39).trim()}…`
    : description
}

export function isEverydaySpend(
  transaction: Transaction,
  account: AccountItem | undefined
) {
  if (account?.type !== "transaction") return false
  if (transaction.direction !== "debit") return false
  if (!transaction.amount || transaction.amount.amount >= 0) return false
  if (
    transaction.provider_category &&
    NON_SPEND_CATEGORIES.has(transaction.provider_category)
  ) {
    return false
  }

  return !/settlement drawing/i.test(transaction.description)
}

export function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function formatDateKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  }
) {
  return new Intl.DateTimeFormat("en-AU", options).format(
    new Date(`${dateKey}T00:00:00Z`)
  )
}

export function formatTransactionDateTime(
  transaction: Pick<Transaction, "date" | "datetime">,
  timeZone: string
) {
  const date = formatDateKey(transaction.date)
  if (!transaction.datetime) return { date, time: null }

  const instant = new Date(transaction.datetime)
  if (Number.isNaN(instant.getTime())) return { date, time: null }

  const timeParts = new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(instant)
  const hour = timeParts.find((part) => part.type === "hour")?.value
  const minute = timeParts.find((part) => part.type === "minute")?.value

  // Some institutions use local midnight when they only know the posting date.
  if (hour === "00" && minute === "00") return { date, time: null }

  return {
    date,
    time: new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(instant),
  }
}

export type LoanProjection = {
  months: number
  interestPaid: number
  payoffDate: string
}

export function calculateLoanProjection({
  principalMinor,
  annualRate,
  monthlyPaymentMinor,
  offsetMinor = 0,
  from,
}: {
  principalMinor: number
  annualRate: number
  monthlyPaymentMinor: number
  offsetMinor?: number
  from: string
}): LoanProjection | null {
  let balance = Math.abs(principalMinor) / 100
  const offset = Math.max(0, offsetMinor / 100)
  const payment = monthlyPaymentMinor / 100
  const monthlyRate = annualRate / 12
  let interestPaid = 0
  let months = 0

  while (balance > 0.005 && months < 1_200) {
    const interest = Math.max(0, balance - offset) * monthlyRate

    if (payment <= interest) return null

    interestPaid += interest
    balance = Math.max(0, balance + interest - payment)
    months += 1
  }

  const payoff = new Date(from)
  payoff.setUTCMonth(payoff.getUTCMonth() + months)

  return {
    months,
    interestPaid: Math.round(interestPaid * 100),
    payoffDate: payoff.toISOString(),
  }
}

export function formatDuration(months: number | null | undefined) {
  if (months === null || months === undefined) return "Not available"
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) return `${remainingMonths} months`
  if (remainingMonths === 0) return `${years} years`
  return `${years}y ${remainingMonths}m`
}

export type PayoffPoint = {
  year: string
  balance: number
}

export function buildPayoffSeries({
  principalMinor,
  annualRate,
  monthlyPaymentMinor,
  offsetMinor,
  from,
}: {
  principalMinor: number
  annualRate: number
  monthlyPaymentMinor: number
  offsetMinor: number
  from: string
}): PayoffPoint[] {
  let balance = Math.abs(principalMinor) / 100
  const offset = Math.max(0, offsetMinor / 100)
  const payment = monthlyPaymentMinor / 100
  const monthlyRate = annualRate / 12
  const start = new Date(from)
  const points: PayoffPoint[] = [
    { year: String(start.getUTCFullYear()), balance: Math.round(balance) },
  ]

  for (let month = 1; month <= 1_200 && balance > 0.005; month += 1) {
    const interest = Math.max(0, balance - offset) * monthlyRate
    if (payment <= interest) break
    balance = Math.max(0, balance + interest - payment)

    if (month % 60 === 0 || balance === 0) {
      const date = new Date(start)
      date.setUTCMonth(date.getUTCMonth() + month)
      points.push({
        year: String(date.getUTCFullYear()),
        balance: Math.round(balance),
      })
    }
  }

  return points
}

export function flattenTransactions(accounts: AccountSnapshot[]) {
  return accounts
    .flatMap(({ transactions }) => transactions)
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date)
      if (byDate !== 0) return byDate
      return (b.datetime ?? "").localeCompare(a.datetime ?? "")
    })
}
