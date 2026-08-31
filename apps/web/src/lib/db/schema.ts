import { sql } from "drizzle-orm"
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  address: text("address").notNull(),
  propertyType: text("property_type").notNull().default("residential"),
  addressLine1: text("address_line_1"),
  suburb: text("suburb"),
  state: text("state"),
  postcode: text("postcode"),
  country: text("country").notNull().default("Australia"),
  purchasePriceMinor: integer("purchase_price_minor"),
  purchaseDate: text("purchase_date"),
  monthlyTakeHomeIncomeMinor: integer("monthly_take_home_income_minor"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const householdMembers = sqliteTable(
  "household_members",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    monthlyTakeHomeIncomeMinor: integer(
      "monthly_take_home_income_minor"
    ).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("household_members_sort_order_idx").on(table.sortOrder)]
)

export const accountPreferences = sqliteTable("account_preferences", {
  accountId: text("account_id").primaryKey(),
  displayName: text("display_name").notNull(),
  providerName: text("provider_name").notNull(),
  accountType: text("account_type").notNull(),
  institutionName: text("institution_name").notNull(),
  institutionLogo: text("institution_logo"),
  propertyId: text("property_id").references(() => properties.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const monthlyBudgets = sqliteTable(
  "monthly_budgets",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    category: text("category").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("monthly_budgets_month_category_unique").on(
      table.month,
      table.category
    ),
  ]
)

export const bankingSyncs = sqliteTable("banking_syncs", {
  source: text("source").primaryKey(),
  fetchedAt: text("fetched_at").notNull(),
  timezone: text("timezone").notNull(),
  apiVersion: text("api_version").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const connectedAccounts = sqliteTable("connected_accounts", {
  accountId: text("account_id").primaryKey(),
  connectionId: text("connection_id").notNull(),
  providerName: text("provider_name").notNull(),
  category: text("category").notNull(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type").notNull(),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  institutionLogo: text("institution_logo"),
  accountNumber: text("account_number"),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  rawAccountJson: text("raw_account_json").notNull(),
  rawDetailsJson: text("raw_details_json"),
  warningsJson: text("warnings_json").notNull(),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const accountBalanceSnapshots = sqliteTable(
  "account_balance_snapshots",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => connectedAccounts.accountId, { onDelete: "cascade" }),
    currentAmountMinor: integer("current_amount_minor"),
    currentCurrency: text("current_currency"),
    availableAmountMinor: integer("available_amount_minor"),
    availableCurrency: text("available_currency"),
    balanceCurrency: text("balance_currency"),
    rawBalanceJson: text("raw_balance_json"),
    fetchedAt: text("fetched_at").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("account_balance_snapshots_account_fetched_unique").on(
      table.accountId,
      table.fetchedAt
    ),
    index("account_balance_snapshots_account_fetched_idx").on(
      table.accountId,
      table.fetchedAt
    ),
  ]
)

export const bankTransactions = sqliteTable(
  "bank_transactions",
  {
    transactionId: text("transaction_id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => connectedAccounts.accountId, { onDelete: "cascade" }),
    status: text("status").notNull(),
    date: text("date").notNull(),
    datetime: text("datetime"),
    postDate: text("post_date"),
    postDatetime: text("post_datetime"),
    valueDate: text("value_date"),
    valueDatetime: text("value_datetime"),
    description: text("description").notNull(),
    amountMinor: integer("amount_minor"),
    currency: text("currency"),
    direction: text("direction").notNull(),
    providerCategory: text("provider_category"),
    customCategory: text("custom_category"),
    noteMarkdown: text("note_markdown"),
    category: text("category"),
    merchantName: text("merchant_name"),
    merchantCategoryCode: text("merchant_category_code"),
    rawTransactionJson: text("raw_transaction_json").notNull(),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("bank_transactions_account_date_idx").on(table.accountId, table.date),
    index("bank_transactions_merchant_idx").on(table.merchantName),
    index("bank_transactions_provider_category_idx").on(table.providerCategory),
  ]
)

export const merchantLogoRules = sqliteTable(
  "merchant_logo_rules",
  {
    id: text("id").primaryKey(),
    matchKey: text("match_key").notNull(),
    matchKind: text("match_kind").notNull(),
    matchValue: text("match_value").notNull(),
    displayName: text("display_name").notNull(),
    customName: text("custom_name"),
    logo: text("logo"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("merchant_logo_rules_match_key_unique").on(table.matchKey),
  ]
)

export const propertyValuations = sqliteTable(
  "property_valuations",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    valueMinor: integer("value_minor").notNull(),
    loanBalanceMinor: integer("loan_balance_minor").notNull(),
    valuedAt: text("valued_at").notNull(),
    source: text("source").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("property_valuations_property_unique").on(table.propertyId),
  ]
)

export const manualNetWorthItems = sqliteTable(
  "manual_net_worth_items",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    itemType: text("item_type").notNull(),
    category: text("category").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("manual_net_worth_items_type_idx").on(table.itemType)]
)

export const netWorthSettings = sqliteTable("net_worth_settings", {
  id: text("id").primaryKey(),
  monthlySuperContributionMinor: integer(
    "monthly_super_contribution_minor"
  ).notNull(),
  superContributionTaxBps: integer("super_contribution_tax_bps").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})
