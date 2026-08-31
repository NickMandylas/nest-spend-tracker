import { defineTool } from "eve/tools"
import { z } from "zod"

import {
  categoryLabel,
  currentMonthKey,
  minorToAud,
  TIME_ZONE,
  withReadOnlyDatabase,
} from "../lib/database"

type AccountRow = {
  accountId: string
  accountType: string
  availableAmountMinor: number | null
  currency: string
  currentAmountMinor: number | null
  displayName: string
  fetchedAt: string
  propertyId: string | null
  rawDetailsJson: string | null
}

type PropertyRow = {
  id: string
  address: string
  addressLine1: string | null
  country: string
  displayName: string
  postcode: string | null
  propertyType: string
  purchaseDate: string | null
  purchasePriceMinor: number | null
  state: string | null
  suburb: string | null
  source: string | null
  valueMinor: number | null
  valuedAt: string | null
}

type HouseholdMemberRow = {
  displayName: string
  monthlyTakeHomeIncomeMinor: number
}

type ManualItemRow = {
  amountMinor: number
  category: string
  displayName: string
  itemType: string
}

function loanDetails(rawDetailsJson: string | null) {
  if (!rawDetailsJson) return null

  try {
    const details = JSON.parse(rawDetailsJson) as {
      lending_rate?: unknown
      loan_details?: {
        loan_end_date?: unknown
        min_instalment_amount?: unknown
        min_instalment_currency?: unknown
        next_instalment_date?: unknown
        repayment_frequency?: unknown
        repayment_type?: unknown
      } | null
    }
    const loan = details.loan_details
    const rawRate = Number(details.lending_rate)
    const rate = Number.isFinite(rawRate)
      ? Number((rawRate <= 1 ? rawRate * 100 : rawRate).toFixed(4))
      : null
    const repayment = Number(loan?.min_instalment_amount)

    return {
      interestRatePercent: rate,
      loanEndDate:
        typeof loan?.loan_end_date === "string" ? loan.loan_end_date : null,
      minimumRepaymentAud: Number.isFinite(repayment) ? repayment : null,
      minimumRepaymentCurrency:
        typeof loan?.min_instalment_currency === "string"
          ? loan.min_instalment_currency.toUpperCase()
          : "AUD",
      nextRepaymentDate:
        typeof loan?.next_instalment_date === "string"
          ? loan.next_instalment_date
          : null,
      repaymentFrequency:
        typeof loan?.repayment_frequency === "string"
          ? loan.repayment_frequency
          : null,
      repaymentType:
        typeof loan?.repayment_type === "string" ? loan.repayment_type : null,
    }
  } catch {
    return null
  }
}

export default defineTool({
  description:
    "Get the latest read-only household overview: household member income, cached account balances, this month's spending and budget, property value and equity, loan details, superannuation, and net worth.",
  inputSchema: z.object({}),
  execute() {
    return withReadOnlyDatabase((database) => {
      const accounts = database
        .prepare(
          `WITH ranked_balances AS (
             SELECT *, ROW_NUMBER() OVER (
               PARTITION BY account_id ORDER BY fetched_at DESC, created_at DESC
             ) AS rank
             FROM account_balance_snapshots
           )
           SELECT
             connected.account_id AS accountId,
             connected.account_type AS accountType,
             COALESCE(preferences.display_name, connected.account_name) AS displayName,
             balances.current_amount_minor AS currentAmountMinor,
             balances.available_amount_minor AS availableAmountMinor,
             COALESCE(
               balances.current_currency,
               balances.available_currency,
               connected.currency,
               'AUD'
             ) AS currency,
             balances.fetched_at AS fetchedAt,
             preferences.property_id AS propertyId,
             connected.raw_details_json AS rawDetailsJson
           FROM connected_accounts AS connected
           JOIN ranked_balances AS balances
             ON balances.account_id = connected.account_id AND balances.rank = 1
           LEFT JOIN account_preferences AS preferences
             ON preferences.account_id = connected.account_id
           ORDER BY connected.account_type, displayName`
        )
        .all() as AccountRow[]

      const properties = database
        .prepare(
          `SELECT
             properties.id AS id,
             properties.display_name AS displayName,
             properties.address AS address,
             properties.property_type AS propertyType,
             properties.address_line_1 AS addressLine1,
             properties.suburb AS suburb,
             properties.state AS state,
             properties.postcode AS postcode,
             properties.country AS country,
             properties.purchase_price_minor AS purchasePriceMinor,
             properties.purchase_date AS purchaseDate,
             valuations.value_minor AS valueMinor,
             valuations.valued_at AS valuedAt,
             valuations.source AS source
           FROM properties
           LEFT JOIN property_valuations AS valuations
             ON valuations.property_id = properties.id
           ORDER BY properties.created_at, properties.display_name`
        )
        .all() as PropertyRow[]

      const householdMembers = database
        .prepare(
          `SELECT
             display_name AS displayName,
             monthly_take_home_income_minor AS monthlyTakeHomeIncomeMinor
           FROM household_members
           ORDER BY sort_order, created_at`
        )
        .all() as HouseholdMemberRow[]

      const manualItems = database
        .prepare(
          `SELECT
             display_name AS displayName,
             item_type AS itemType,
             category,
             amount_minor AS amountMinor
           FROM manual_net_worth_items
           ORDER BY sort_order, display_name`
        )
        .all() as ManualItemRow[]

      const netWorthSettings = database
        .prepare(
          `SELECT
             monthly_super_contribution_minor AS monthlySuperContributionMinor,
             super_contribution_tax_bps AS superContributionTaxBps
           FROM net_worth_settings
           ORDER BY updated_at DESC
           LIMIT 1`
        )
        .get() as
        | {
            monthlySuperContributionMinor: number
            superContributionTaxBps: number
          }
        | undefined

      const month = currentMonthKey()
      const spend = database
        .prepare(
          `SELECT
             COALESCE(SUM(ABS(transactions.amount_minor)), 0) AS totalMinor,
             COUNT(*) AS transactionCount
           FROM bank_transactions AS transactions
           JOIN connected_accounts AS accounts
             ON accounts.account_id = transactions.account_id
           WHERE accounts.account_type = 'transaction'
             AND transactions.direction = 'debit'
             AND transactions.amount_minor < 0
             AND transactions.date LIKE ?
             AND COALESCE(
               CASE
                 WHEN transactions.custom_category = 'UNCATEGORISED' THEN NULL
                 ELSE COALESCE(transactions.custom_category, transactions.provider_category)
               END,
               ''
             ) NOT IN (
               'INCOME', 'LOAN_PAYMENTS', 'TRANSFER_IN', 'TRANSFER_OUT'
             )
             AND transactions.description NOT LIKE '%settlement drawing%'`
        )
        .get(`${month}-%`) as { totalMinor: number; transactionCount: number }

      const totalBudget = database
        .prepare(
          `SELECT amount_minor AS amountMinor
           FROM monthly_budgets
           WHERE month = ? AND category = '__TOTAL__'
           LIMIT 1`
        )
        .get(month) as { amountMinor: number } | undefined

      const latestSync = database
        .prepare(
          `SELECT fetched_at AS fetchedAt, source, timezone
           FROM banking_syncs
           ORDER BY fetched_at DESC
           LIMIT 1`
        )
        .get() as
        { fetchedAt: string; source: string; timezone: string } | undefined

      const bankAssetsMinor = accounts
        .filter((account) => account.accountType === "transaction")
        .reduce(
          (total, account) =>
            total + Math.max(account.currentAmountMinor ?? 0, 0),
          0
        )
      const bankLoanMinor = accounts
        .filter((account) => account.accountType === "loan")
        .reduce(
          (total, account) => total + Math.abs(account.currentAmountMinor ?? 0),
          0
        )
      const manualAssetsMinor = manualItems
        .filter((item) => item.itemType === "asset")
        .reduce((total, item) => total + item.amountMinor, 0)
      const manualLiabilitiesMinor = manualItems
        .filter((item) => item.itemType === "liability")
        .reduce((total, item) => total + Math.abs(item.amountMinor), 0)
      const propertyValueMinor = properties.reduce(
        (total, property) => total + (property.valueMinor ?? 0),
        0
      )
      const totalAssetsMinor =
        propertyValueMinor + bankAssetsMinor + manualAssetsMinor
      const totalLiabilitiesMinor = bankLoanMinor + manualLiabilitiesMinor
      const contributionTaxRate =
        (netWorthSettings?.superContributionTaxBps ?? 0) / 10_000
      const grossSuperContributionMinor =
        netWorthSettings?.monthlySuperContributionMinor ?? 0

      return {
        asOf: latestSync?.fetchedAt ?? accounts[0]?.fetchedAt ?? null,
        timezone: latestSync?.timezone ?? TIME_ZONE,
        dataSource: latestSync?.source ?? "local database",
        accounts: accounts.map((account) => ({
          name: account.displayName,
          type: account.accountType,
          currentBalanceAud: minorToAud(account.currentAmountMinor),
          availableBalanceAud: minorToAud(account.availableAmountMinor),
          currency: account.currency.toUpperCase(),
          fetchedAt: account.fetchedAt,
          propertyId: account.propertyId,
        })),
        spending: {
          month,
          spendToDateAud: minorToAud(spend.totalMinor),
          transactionCount: spend.transactionCount,
          budgetAud: minorToAud(totalBudget?.amountMinor),
          budgetRemainingAud:
            totalBudget == null
              ? null
              : minorToAud(totalBudget.amountMinor - spend.totalMinor),
        },
        householdIncome: {
          members: householdMembers.map((member) => ({
            name: member.displayName,
            monthlyTakeHomeIncomeAud: minorToAud(
              member.monthlyTakeHomeIncomeMinor
            ),
          })),
          totalMonthlyTakeHomeIncomeAud: minorToAud(
            householdMembers.reduce(
              (total, member) => total + member.monthlyTakeHomeIncomeMinor,
              0
            )
          ),
        },
        properties: properties.map((property) => {
          const linkedLoans = accounts.filter(
            (account) =>
              account.accountType === "loan" &&
              account.propertyId === property.id
          )
          const linkedLoanMinor = linkedLoans.reduce(
            (total, account) =>
              total + Math.abs(account.currentAmountMinor ?? 0),
            0
          )

          return {
            id: property.id,
            name: property.displayName,
            type: property.propertyType,
            address: property.address,
            location: {
              addressLine1: property.addressLine1,
              suburb: property.suburb,
              state: property.state,
              postcode: property.postcode,
              country: property.country,
            },
            purchasePriceAud: minorToAud(property.purchasePriceMinor),
            purchaseDate: property.purchaseDate,
            estimatedValueAud: minorToAud(property.valueMinor),
            currentLoanBalanceAud: minorToAud(linkedLoanMinor),
            equityAud:
              property.valueMinor === null
                ? null
                : minorToAud(property.valueMinor - linkedLoanMinor),
            valuationDate: property.valuedAt,
            valuationSource: property.source,
            loans: linkedLoans.map((loan) => ({
              accountName: loan.displayName,
              balanceAud: minorToAud(Math.abs(loan.currentAmountMinor ?? 0)),
              ...loanDetails(loan.rawDetailsJson),
            })),
          }
        }),
        unlinkedLoans: accounts
          .filter(
            (account) => account.accountType === "loan" && !account.propertyId
          )
          .map((loan) => ({
            accountName: loan.displayName,
            balanceAud: minorToAud(Math.abs(loan.currentAmountMinor ?? 0)),
            ...loanDetails(loan.rawDetailsJson),
          })),
        manualNetWorthItems: manualItems.map((item) => ({
          name: item.displayName,
          type: item.itemType,
          category: categoryLabel(item.category),
          amountAud: minorToAud(item.amountMinor),
        })),
        superannuation: {
          currentBalanceAud: minorToAud(
            manualItems
              .filter(
                (item) =>
                  item.itemType === "asset" &&
                  item.category === "superannuation"
              )
              .reduce((total, item) => total + item.amountMinor, 0)
          ),
          grossMonthlyContributionAud: minorToAud(grossSuperContributionMinor),
          contributionTaxRatePercent: Number(
            (contributionTaxRate * 100).toFixed(2)
          ),
          netMonthlyContributionAud: minorToAud(
            Math.round(grossSuperContributionMinor * (1 - contributionTaxRate))
          ),
        },
        netWorth: {
          totalAssetsAud: minorToAud(totalAssetsMinor),
          totalLiabilitiesAud: minorToAud(totalLiabilitiesMinor),
          netWorthAud: minorToAud(totalAssetsMinor - totalLiabilitiesMinor),
        },
      }
    })
  },
})
