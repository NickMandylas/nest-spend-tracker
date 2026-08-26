import "server-only"

import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

import { getDatabase } from "@/lib/db"
import { bankTransactions, merchantLogoRules } from "@/lib/db/schema"
import { getMerchantIdentity } from "@/lib/merchant-identity"
import type { FinancialSnapshot, Transaction } from "@/lib/redbark-types"

function parseStoredTransaction(value: string): Transaction | null {
  try {
    const transaction = JSON.parse(value) as Partial<Transaction>
    if (
      typeof transaction.id !== "string" ||
      typeof transaction.account !== "string" ||
      typeof transaction.description !== "string"
    ) {
      return null
    }
    return transaction as Transaction
  } catch {
    return null
  }
}

export function getStoredTransaction(transactionId: string) {
  const row = getDatabase()
    .select({ rawTransactionJson: bankTransactions.rawTransactionJson })
    .from(bankTransactions)
    .where(eq(bankTransactions.transactionId, transactionId))
    .get()

  return row ? parseStoredTransaction(row.rawTransactionJson) : null
}

export function applyMerchantLogoRules(
  snapshot: FinancialSnapshot
): FinancialSnapshot {
  const customisationsByMatchKey = new Map(
    getDatabase()
      .select({
        matchKey: merchantLogoRules.matchKey,
        id: merchantLogoRules.id,
        logo: merchantLogoRules.logo,
        customName: merchantLogoRules.customName,
        updatedAt: merchantLogoRules.updatedAt,
      })
      .from(merchantLogoRules)
      .all()
      .map(
        (rule) =>
          [
            rule.matchKey,
            {
              logoUrl: rule.logo
                ? `/api/merchant-logo/${rule.id}?v=${rule.updatedAt.getTime()}`
                : null,
              customName: rule.customName,
            },
          ] as const
      )
  )

  if (customisationsByMatchKey.size === 0) return snapshot

  return {
    ...snapshot,
    accounts: snapshot.accounts.map((account) => ({
      ...account,
      transactions: account.transactions.map((transaction) => {
        const customisation = customisationsByMatchKey.get(
          getMerchantIdentity(transaction).matchKey
        )
        return {
          ...transaction,
          custom_logo: customisation?.logoUrl ?? null,
          custom_merchant_name: customisation?.customName ?? null,
        }
      }),
    })),
  }
}

export function applyMerchantLogoRule(transaction: Transaction): Transaction {
  const identity = getMerchantIdentity(transaction)
  const rule = getDatabase()
    .select({
      id: merchantLogoRules.id,
      logo: merchantLogoRules.logo,
      customName: merchantLogoRules.customName,
      updatedAt: merchantLogoRules.updatedAt,
    })
    .from(merchantLogoRules)
    .where(eq(merchantLogoRules.matchKey, identity.matchKey))
    .get()

  return {
    ...transaction,
    custom_logo: rule?.logo
      ? `/api/merchant-logo/${rule.id}?v=${rule.updatedAt.getTime()}`
      : null,
    custom_merchant_name: rule?.customName ?? null,
  }
}

export function saveMerchantRule(
  transaction: Transaction,
  updates: { logo?: string | null; customName?: string | null }
) {
  const db = getDatabase()
  const identity = getMerchantIdentity(transaction)
  const now = new Date()
  const existingRule = db
    .select()
    .from(merchantLogoRules)
    .where(eq(merchantLogoRules.matchKey, identity.matchKey))
    .get()
  const logo =
    updates.logo === undefined ? (existingRule?.logo ?? null) : updates.logo
  const customName =
    updates.customName === undefined
      ? (existingRule?.customName ?? null)
      : updates.customName

  if (!logo && !customName) {
    if (existingRule) {
      db.delete(merchantLogoRules)
        .where(eq(merchantLogoRules.matchKey, identity.matchKey))
        .run()
    }
    return { ...identity, logoUrl: null, customName: null }
  }

  db.insert(merchantLogoRules)
    .values({
      id: randomUUID(),
      matchKey: identity.matchKey,
      matchKind: identity.matchKind,
      matchValue: identity.matchValue,
      displayName: identity.displayName,
      customName,
      logo,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: merchantLogoRules.matchKey,
      set: {
        matchKind: identity.matchKind,
        matchValue: identity.matchValue,
        displayName: identity.displayName,
        customName,
        logo,
        updatedAt: now,
      },
    })
    .run()

  const savedRule = db
    .select({
      id: merchantLogoRules.id,
      logo: merchantLogoRules.logo,
      customName: merchantLogoRules.customName,
      updatedAt: merchantLogoRules.updatedAt,
    })
    .from(merchantLogoRules)
    .where(eq(merchantLogoRules.matchKey, identity.matchKey))
    .get()

  return {
    ...identity,
    logoUrl: savedRule?.logo
      ? `/api/merchant-logo/${savedRule.id}?v=${savedRule.updatedAt.getTime()}`
      : null,
    customName: savedRule?.customName ?? null,
  }
}

export function getMerchantLogoRule(ruleId: string) {
  return getDatabase()
    .select({ logo: merchantLogoRules.logo })
    .from(merchantLogoRules)
    .where(eq(merchantLogoRules.id, ruleId))
    .get()
}
