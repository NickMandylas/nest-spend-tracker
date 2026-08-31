import "server-only"

import { eq } from "drizzle-orm"

import { getDatabase } from "@/lib/db"
import {
  accountBalanceSnapshots,
  bankTransactions,
  bankingSyncs,
  connectedAccounts,
} from "@/lib/db/schema"
import { applyTransactionCategoryOverride } from "@/lib/finance"
import { getFinancialSnapshot, RedbarkError } from "@/lib/redbark"
import type { FinancialSnapshot, Transaction } from "@/lib/redbark-types"

const REDBARK_SYNC_SOURCE = "redbark"

function parseFinancialSnapshot(value: string): FinancialSnapshot | null {
  try {
    const parsed = JSON.parse(value) as Partial<FinancialSnapshot>
    if (
      !Array.isArray(parsed.accounts) ||
      typeof parsed.fetchedAt !== "string" ||
      typeof parsed.timezone !== "string" ||
      typeof parsed.apiVersion !== "string"
    ) {
      return null
    }

    return parsed as FinancialSnapshot
  } catch {
    return null
  }
}

function parseTransaction(value: string): Transaction | null {
  try {
    const parsed = JSON.parse(value) as Partial<Transaction>
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.account !== "string" ||
      typeof parsed.date !== "string" ||
      typeof parsed.description !== "string"
    ) {
      return null
    }

    return parsed as Transaction
  } catch {
    return null
  }
}

export function saveFinancialSnapshot(snapshot: FinancialSnapshot) {
  const db = getDatabase()
  const now = new Date()

  db.transaction((databaseTransaction) => {
    snapshot.accounts.forEach(
      ({ account, balance, details, transactions, warnings }) => {
        databaseTransaction
          .insert(connectedAccounts)
          .values({
            accountId: account.id,
            connectionId: account.connection,
            providerName: account.provider,
            category: account.category,
            accountName: account.name,
            accountType: account.type,
            institutionId: account.institution.id,
            institutionName: account.institution.name,
            institutionLogo: account.institution.logo,
            accountNumber: account.account_number,
            currency: account.currency,
            status: account.status,
            rawAccountJson: JSON.stringify(account),
            rawDetailsJson: details ? JSON.stringify(details) : null,
            warningsJson: JSON.stringify(warnings),
            firstSeenAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: connectedAccounts.accountId,
            set: {
              connectionId: account.connection,
              providerName: account.provider,
              category: account.category,
              accountName: account.name,
              accountType: account.type,
              institutionId: account.institution.id,
              institutionName: account.institution.name,
              institutionLogo: account.institution.logo,
              accountNumber: account.account_number,
              currency: account.currency,
              status: account.status,
              rawAccountJson: JSON.stringify(account),
              rawDetailsJson: details ? JSON.stringify(details) : null,
              warningsJson: JSON.stringify(warnings),
              updatedAt: now,
            },
          })
          .run()

        databaseTransaction
          .insert(accountBalanceSnapshots)
          .values({
            id: `${account.id}:${snapshot.fetchedAt}`,
            accountId: account.id,
            currentAmountMinor: balance?.current?.amount ?? null,
            currentCurrency: balance?.current?.currency ?? null,
            availableAmountMinor: balance?.available?.amount ?? null,
            availableCurrency: balance?.available?.currency ?? null,
            balanceCurrency: balance?.currency ?? null,
            rawBalanceJson: balance ? JSON.stringify(balance) : null,
            fetchedAt: snapshot.fetchedAt,
            createdAt: now,
          })
          .onConflictDoNothing()
          .run()

        transactions.forEach((transaction) => {
          databaseTransaction
            .insert(bankTransactions)
            .values({
              transactionId: transaction.id,
              accountId: transaction.account,
              status: transaction.status,
              date: transaction.date,
              datetime: transaction.datetime,
              postDate: transaction.post_date,
              postDatetime: transaction.post_datetime,
              valueDate: transaction.value_date,
              valueDatetime: transaction.value_datetime,
              description: transaction.description,
              amountMinor: transaction.amount?.amount ?? null,
              currency: transaction.amount?.currency ?? null,
              direction: transaction.direction,
              providerCategory: transaction.provider_category,
              category: transaction.category,
              merchantName: transaction.merchant_name,
              merchantCategoryCode: transaction.merchant_category_code,
              rawTransactionJson: JSON.stringify(transaction),
              firstSeenAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: bankTransactions.transactionId,
              set: {
                accountId: transaction.account,
                status: transaction.status,
                date: transaction.date,
                datetime: transaction.datetime,
                postDate: transaction.post_date,
                postDatetime: transaction.post_datetime,
                valueDate: transaction.value_date,
                valueDatetime: transaction.value_datetime,
                description: transaction.description,
                amountMinor: transaction.amount?.amount ?? null,
                currency: transaction.amount?.currency ?? null,
                direction: transaction.direction,
                providerCategory: transaction.provider_category,
                category: transaction.category,
                merchantName: transaction.merchant_name,
                merchantCategoryCode: transaction.merchant_category_code,
                rawTransactionJson: JSON.stringify(transaction),
                updatedAt: now,
              },
            })
            .run()
        })
      }
    )

    databaseTransaction
      .insert(bankingSyncs)
      .values({
        source: REDBARK_SYNC_SOURCE,
        fetchedAt: snapshot.fetchedAt,
        timezone: snapshot.timezone,
        apiVersion: snapshot.apiVersion,
        snapshotJson: JSON.stringify(snapshot),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: bankingSyncs.source,
        set: {
          fetchedAt: snapshot.fetchedAt,
          timezone: snapshot.timezone,
          apiVersion: snapshot.apiVersion,
          snapshotJson: JSON.stringify(snapshot),
          updatedAt: now,
        },
      })
      .run()
  })
}

export function getCachedFinancialSnapshot(): FinancialSnapshot | null {
  const db = getDatabase()
  const sync = db
    .select()
    .from(bankingSyncs)
    .where(eq(bankingSyncs.source, REDBARK_SYNC_SOURCE))
    .get()

  if (!sync) return null

  const snapshot = parseFinancialSnapshot(sync.snapshotJson)
  if (!snapshot) return null

  const transactionsByAccount = new Map<string, Transaction[]>()
  db.select({
    accountId: bankTransactions.accountId,
    customCategory: bankTransactions.customCategory,
    noteMarkdown: bankTransactions.noteMarkdown,
    rawTransactionJson: bankTransactions.rawTransactionJson,
  })
    .from(bankTransactions)
    .all()
    .forEach((row) => {
      const transaction = parseTransaction(row.rawTransactionJson)
      if (!transaction) return

      const transactions = transactionsByAccount.get(row.accountId) ?? []
      transactions.push(
        applyTransactionCategoryOverride(
          { ...transaction, note_markdown: row.noteMarkdown },
          row.customCategory
        )
      )
      transactionsByAccount.set(row.accountId, transactions)
    })

  return {
    ...snapshot,
    accounts: snapshot.accounts.map((account) => ({
      ...account,
      transactions: transactionsByAccount.get(account.account.id) ?? [],
    })),
  }
}

export async function synchroniseFinancialSnapshot() {
  const snapshot = await getFinancialSnapshot()

  if (snapshot.accounts.length === 0) {
    throw new RedbarkError("No connected accounts were returned by Redbark.")
  }

  saveFinancialSnapshot(snapshot)
  return snapshot
}

export function saveBankTransaction(transaction: Transaction) {
  const now = new Date()

  getDatabase()
    .insert(bankTransactions)
    .values({
      transactionId: transaction.id,
      accountId: transaction.account,
      status: transaction.status,
      date: transaction.date,
      datetime: transaction.datetime,
      postDate: transaction.post_date,
      postDatetime: transaction.post_datetime,
      valueDate: transaction.value_date,
      valueDatetime: transaction.value_datetime,
      description: transaction.description,
      amountMinor: transaction.amount?.amount ?? null,
      currency: transaction.amount?.currency ?? null,
      direction: transaction.direction,
      providerCategory: transaction.provider_category,
      category: transaction.category,
      merchantName: transaction.merchant_name,
      merchantCategoryCode: transaction.merchant_category_code,
      rawTransactionJson: JSON.stringify(transaction),
      firstSeenAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: bankTransactions.transactionId,
      set: {
        accountId: transaction.account,
        status: transaction.status,
        date: transaction.date,
        datetime: transaction.datetime,
        postDate: transaction.post_date,
        postDatetime: transaction.post_datetime,
        valueDate: transaction.value_date,
        valueDatetime: transaction.value_datetime,
        description: transaction.description,
        amountMinor: transaction.amount?.amount ?? null,
        currency: transaction.amount?.currency ?? null,
        direction: transaction.direction,
        providerCategory: transaction.provider_category,
        category: transaction.category,
        merchantName: transaction.merchant_name,
        merchantCategoryCode: transaction.merchant_category_code,
        rawTransactionJson: JSON.stringify(transaction),
        updatedAt: now,
      },
    })
    .run()
}
