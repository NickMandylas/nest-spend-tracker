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
  rawDetailsJson: string | null
}

type PropertyRow = {
  address: string
  displayName: string
  loanBalanceMinor: number
  monthlyTakeHomeIncomeMinor: number | null
  source: string
  valueMinor: number
  valuedAt: string
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
    "Get the latest read-only household overview: cached account balances, this month's spending and budget, property value and equity, loan details, superannuation, and net worth.",
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
             connected.raw_details_json AS rawDetailsJson
           FROM connected_accounts AS connected
           JOIN ranked_balances AS balances
             ON balances.account_id = connected.account_id AND balances.rank = 1
           LEFT JOIN account_preferences AS preferences
             ON preferences.account_id = connected.account_id
           ORDER BY connected.account_type, displayName`
        )
        .all() as AccountRow[]

      const property = database
        .prepare(
          `SELECT
             properties.display_name AS displayName,
             properties.address AS address,
             properties.monthly_take_home_income_minor AS monthlyTakeHomeIncomeMinor,
             valuations.value_minor AS valueMinor,
             valuations.loan_balance_minor AS loanBalanceMinor,
             valuations.valued_at AS valuedAt,
             valuations.source AS source
           FROM properties
           JOIN property_valuations AS valuations
             ON valuations.property_id = properties.id
           ORDER BY valuations.valued_at DESC
           LIMIT 1`
        )
        .get() as PropertyRow | undefined

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
             AND COALESCE(transactions.provider_category, '') NOT IN (
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
      const propertyValueMinor = property?.valueMinor ?? 0
      const totalAssetsMinor =
        propertyValueMinor + bankAssetsMinor + manualAssetsMinor
      const totalLiabilitiesMinor = bankLoanMinor + manualLiabilitiesMinor
      const effectivePropertyLoanMinor =
        bankLoanMinor || property?.loanBalanceMinor || 0
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
        property: property
          ? {
              name: property.displayName,
              address: property.address,
              estimatedValueAud: minorToAud(property.valueMinor),
              currentLoanBalanceAud: minorToAud(effectivePropertyLoanMinor),
              equityAud: minorToAud(
                property.valueMinor - effectivePropertyLoanMinor
              ),
              valuationDate: property.valuedAt,
              valuationSource: property.source,
              storedValuationLoanBalanceAud: minorToAud(
                property.loanBalanceMinor
              ),
              monthlyTakeHomeIncomeAud: minorToAud(
                property.monthlyTakeHomeIncomeMinor
              ),
            }
          : null,
        loan: (() => {
          const loan = accounts.find(
            (account) => account.accountType === "loan"
          )
          return loan
            ? {
                accountName: loan.displayName,
                balanceAud: minorToAud(Math.abs(loan.currentAmountMinor ?? 0)),
                ...loanDetails(loan.rawDetailsJson),
              }
            : null
        })(),
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
