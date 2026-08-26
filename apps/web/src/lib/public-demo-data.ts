import "server-only"

import type { NetWorthProfile } from "@/lib/net-worth-types"
import type {
  DashboardPreferences,
  MonthlyBudgets,
} from "@/lib/preferences-types"
import type {
  AccountDetails,
  AccountItem,
  AccountSnapshot,
  Balance,
  FinancialSnapshot,
  Transaction,
} from "@/lib/redbark-types"

const DEMO_FETCHED_AT = "2026-08-25T09:20:00+10:00"
const DEMO_INSTITUTION = {
  id: "institution_bank_of_melbourne_demo",
  name: "Bank of Melbourne",
  logo: "/brands/bank-of-melbourne.svg",
}

function account({
  id,
  name,
  type,
  accountNumber,
}: {
  id: string
  name: string
  type: string
  accountNumber: string
}): AccountItem {
  return {
    id,
    object: "account_item",
    connection: "connection_demo_household",
    provider: "demo",
    category: type === "loan" ? "loan" : "banking",
    name,
    type,
    institution: DEMO_INSTITUTION,
    account_number: accountNumber,
    currency: "AUD",
    status: "active",
    last_updated_at: DEMO_FETCHED_AT,
    livemode: false,
    created: "2026-01-01T00:00:00Z",
    updated: DEMO_FETCHED_AT,
  }
}

function balance(
  accountId: string,
  current: number,
  available: number | null = current
): Balance {
  return {
    object: "balance",
    account: accountId,
    current: { amount: current, currency: "AUD" },
    available:
      available === null ? null : { amount: available, currency: "AUD" },
    currency: "AUD",
    livemode: false,
  }
}

function transaction({
  id,
  accountId = "account_demo_offset",
  date,
  datetime,
  merchant,
  description = merchant,
  amount,
  category,
  direction = "debit",
  status = "completed",
}: {
  id: string
  accountId?: string
  date: string
  datetime: string | null
  merchant: string
  description?: string
  amount: number
  category: string
  direction?: string
  status?: string
}): Transaction {
  return {
    id,
    object: "transaction",
    account: accountId,
    status,
    date,
    datetime,
    post_date: date,
    post_datetime: datetime,
    value_date: date,
    value_datetime: datetime,
    description,
    amount: { amount, currency: "AUD" },
    direction,
    provider_category: category,
    category,
    merchant_name: merchant,
    merchant_category_code: null,
    livemode: false,
    custom_logo: null,
    custom_merchant_name: null,
  }
}

const offsetAccount = account({
  id: "account_demo_offset",
  name: "Everyday Offset",
  type: "transaction",
  accountNumber: "DEMO 0001",
})

const loanAccount = account({
  id: "account_demo_loan",
  name: "Variable Property Loan",
  type: "loan",
  accountNumber: "DEMO 0002",
})

const offsetDetails: AccountDetails = {
  object: "account_details",
  account: offsetAccount.id,
  product_name: "Offset transaction account",
  deposit_rate: "0",
  deposit_rates: [],
  lending_rate: null,
  lending_rates: [],
  fees: [],
  features: [],
  loan_details: null,
  livemode: false,
}

const loanDetails: AccountDetails = {
  object: "account_details",
  account: loanAccount.id,
  product_name: "Variable owner-occupied property loan",
  deposit_rate: null,
  deposit_rates: [],
  lending_rate: "0.0575",
  lending_rates: [],
  fees: [],
  features: [],
  loan_details: {
    loan_end_date: "2054-06-30",
    repayment_type: "principal_and_interest",
    repayment_frequency: "monthly",
    next_instalment_date: "2026-09-18",
    min_instalment_amount: "4100.00",
    min_instalment_currency: "AUD",
    original_loan_amount: "720000.00",
    original_loan_currency: "AUD",
    original_start_date: "2024-07-01",
    offset_account_enabled: true,
  },
  livemode: false,
}

const offsetTransactions = [
  transaction({
    id: "txn_demo_001",
    date: "2026-08-25",
    datetime: "2026-08-25T08:42:00+10:00",
    merchant: "Woolworths",
    amount: -12_640,
    category: "FOOD_AND_DRINK_GROCERIES",
  }),
  transaction({
    id: "txn_demo_002",
    date: "2026-08-24",
    datetime: "2026-08-24T17:18:00+10:00",
    merchant: "Coles",
    amount: -8_475,
    category: "FOOD_AND_DRINK_GROCERIES",
    status: "pending",
  }),
  transaction({
    id: "txn_demo_003",
    date: "2026-08-23",
    datetime: "2026-08-23T10:14:00+10:00",
    merchant: "Kmart",
    amount: -4_260,
    category: "MERCHANDISE",
  }),
  transaction({
    id: "txn_demo_004",
    date: "2026-08-21",
    datetime: "2026-08-21T07:35:00+10:00",
    merchant: "Bunnings Warehouse",
    amount: -7_820,
    category: "MERCHANDISE",
  }),
  transaction({
    id: "txn_demo_005",
    date: "2026-08-18",
    datetime: "2026-08-18T16:06:00+10:00",
    merchant: "Uber Eats",
    amount: -3_890,
    category: "FOOD_AND_DRINK",
  }),
  transaction({
    id: "txn_demo_006",
    date: "2026-08-15",
    datetime: "2026-08-15T11:22:00+10:00",
    merchant: "Netflix",
    amount: -2_599,
    category: "SERVICES",
  }),
  transaction({
    id: "txn_demo_007",
    date: "2026-08-12",
    datetime: "2026-08-12T06:30:00+10:00",
    merchant: "Example Employer",
    description: "Monthly salary",
    amount: 625_000,
    category: "INCOME",
    direction: "credit",
  }),
  transaction({
    id: "txn_demo_008",
    date: "2026-08-09",
    datetime: null,
    merchant: "Spotify",
    amount: -1_399,
    category: "SERVICES",
  }),
  transaction({
    id: "txn_demo_009",
    date: "2026-08-04",
    datetime: "2026-08-04T18:51:00+10:00",
    merchant: "Coles",
    amount: -9_235,
    category: "FOOD_AND_DRINK_GROCERIES",
  }),
]

const loanTransactions = [
  transaction({
    id: "txn_demo_loan_001",
    accountId: loanAccount.id,
    date: "2026-08-18",
    datetime: "2026-08-18T09:00:00+10:00",
    merchant: "Scheduled repayment",
    amount: -410_000,
    category: "LOAN_PAYMENTS",
  }),
]

const demoAccounts: AccountSnapshot[] = [
  {
    account: offsetAccount,
    balance: balance(offsetAccount.id, 8_500_000),
    details: offsetDetails,
    transactions: offsetTransactions,
    warnings: [],
  },
  {
    account: loanAccount,
    balance: balance(loanAccount.id, -64_000_000, 1_200_000),
    details: loanDetails,
    transactions: loanTransactions,
    warnings: [],
  },
]

export function isPublicDemoMode() {
  return process.env.NEST_PUBLIC_DEMO === "1"
}

export function getPublicDemoDashboard(): {
  snapshot: FinancialSnapshot
  preferences: DashboardPreferences
  budgets: MonthlyBudgets
} {
  return {
    snapshot: {
      accounts: demoAccounts,
      fetchedAt: DEMO_FETCHED_AT,
      timezone: "Australia/Melbourne",
      apiVersion: "demo",
    },
    preferences: {
      property: {
        id: "property_demo",
        displayName: "42 Example Avenue",
        address: "42 Example Avenue, Sampleton VIC 3000",
        monthlyTakeHomeIncomeMinor: 1_250_000,
      },
      accounts: {
        [offsetAccount.id]: {
          accountId: offsetAccount.id,
          displayName: "Household Offset",
          providerName: offsetAccount.name,
          accountType: offsetAccount.type,
          institutionName: DEMO_INSTITUTION.name,
          institutionLogo: DEMO_INSTITUTION.logo,
          propertyId: null,
        },
        [loanAccount.id]: {
          accountId: loanAccount.id,
          displayName: "Property Loan (42 Example Avenue)",
          providerName: loanAccount.name,
          accountType: loanAccount.type,
          institutionName: DEMO_INSTITUTION.name,
          institutionLogo: DEMO_INSTITUTION.logo,
          propertyId: "property_demo",
        },
      },
    },
    budgets: {
      month: "2026-08",
      total: 450_000,
      categories: {
        FOOD_AND_DRINK_GROCERIES: 120_000,
        FOOD_AND_DRINK: 45_000,
        SERVICES: 90_000,
        TRANSPORTATION: 35_000,
        PERSONAL_CARE: 30_000,
        MERCHANDISE: 50_000,
      },
    },
  }
}

export function getPublicDemoNetWorthProfile(): NetWorthProfile {
  return {
    property: {
      id: "property_demo",
      displayName: "42 Example Avenue",
      address: "42 Example Avenue, Sampleton VIC 3000",
      valueMinor: 98_000_000,
      valuedAt: "2026-08-25",
      source: "Illustrative estimate",
    },
    items: [
      {
        id: "demo_retirement_a",
        displayName: "Retirement account A",
        itemType: "asset",
        category: "superannuation",
        amountMinor: 14_000_000,
        sortOrder: 10,
      },
      {
        id: "demo_retirement_b",
        displayName: "Retirement account B",
        itemType: "asset",
        category: "superannuation",
        amountMinor: 12_500_000,
        sortOrder: 20,
      },
    ],
    settings: {
      monthlySuperContributionMinor: 320_000,
      superContributionTaxBps: 1_500,
    },
  }
}
