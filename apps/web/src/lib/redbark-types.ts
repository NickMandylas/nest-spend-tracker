export type Money = {
  amount: number
  currency: string
} | null

export type Institution = {
  id: string
  name: string
  logo: string | null
}

export type AccountItem = {
  id: string
  object: "account_item"
  connection: string
  provider: string
  category: string
  name: string
  type: string
  institution: Institution
  account_number: string | null
  currency: string
  status: string
  last_updated_at: string | null
  livemode: boolean
  created: string
  updated: string
}

export type Balance = {
  object: "balance"
  account: string
  current: Money
  available: Money
  currency: string | null
  livemode: boolean
}

export type LoanDetails = {
  loan_end_date?: string
  repayment_type?: string
  repayment_frequency?: string
  next_instalment_date?: string
  min_instalment_amount?: string
  min_instalment_currency?: string
  original_loan_amount?: string
  original_loan_currency?: string
  original_start_date?: string
  offset_account_enabled?: boolean
  [key: string]: unknown
}

export type AccountDetails = {
  object: "account_details"
  account: string
  product_name: string | null
  deposit_rate: string | null
  deposit_rates: Record<string, unknown>[]
  lending_rate: string | null
  lending_rates: Record<string, unknown>[]
  fees: Record<string, unknown>[]
  features: Record<string, unknown>[]
  loan_details: LoanDetails | null
  livemode: boolean
}

export type Transaction = {
  id: string
  object: "transaction"
  account: string
  status: string
  date: string
  datetime: string | null
  post_date: string | null
  post_datetime: string | null
  value_date: string | null
  value_datetime: string | null
  description: string
  amount: Money
  direction: string
  provider_category: string | null
  category: string | null
  merchant_name: string | null
  merchant_category_code: string | null
  livemode: boolean
  custom_logo?: string | null
  custom_merchant_name?: string | null
  custom_category?: string | null
  bank_provider_category?: string | null
  note_markdown?: string | null
}

export type RedbarkList<T> = {
  object: "list"
  data: T[]
  next_page_url: string | null
  previous_page_url: string | null
}

export type AccountSnapshot = {
  account: AccountItem
  balance: Balance | null
  details: AccountDetails | null
  transactions: Transaction[]
  warnings: string[]
}

export type FinancialSnapshot = {
  accounts: AccountSnapshot[]
  fetchedAt: string
  timezone: string
  apiVersion: string
}
