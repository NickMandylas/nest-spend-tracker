"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { saveBankTransaction } from "@/lib/banking-cache"
import { getDatabase } from "@/lib/db"
import { bankTransactions } from "@/lib/db/schema"
import { TRANSACTION_CATEGORY_OPTIONS } from "@/lib/finance"
import {
  applyMerchantLogoRule,
  getStoredTransaction,
  saveMerchantRule,
} from "@/lib/merchant-logo-rules"
import { getMerchantIdentity } from "@/lib/merchant-identity"
import { getTransaction } from "@/lib/redbark"
import type { Transaction } from "@/lib/redbark-types"

const MAX_LOGO_FILE_BYTES = 750_000
const MAX_TRANSACTION_NOTE_LENGTH = 10_000
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

export type TransactionActionResult =
  { ok: true; transaction: Transaction } | { ok: false; message: string }

export type MerchantCustomisationActionResult =
  | {
      ok: true
      logoUrl: string | null
      customName: string | null
      matchLabel: string
    }
  | { ok: false; message: string }

const TRANSACTION_CATEGORY_VALUES = new Set(
  TRANSACTION_CATEGORY_OPTIONS.map((option) => option.value)
)

function isValidProviderId(value: string) {
  return value.length > 0 && value.length <= 180 && !/[\r\n]/.test(value)
}

function revalidateTransactionViews() {
  revalidatePath("/")
  revalidatePath("/activity")
  revalidatePath("/dashboard")
}

function actionError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function validateStoredTransaction(transactionId: string, accountId?: string) {
  if (
    !isValidProviderId(transactionId) ||
    (accountId !== undefined && !isValidProviderId(accountId))
  ) {
    throw new Error("This transaction reference is not valid.")
  }

  const transaction = getStoredTransaction(transactionId)
  if (!transaction || (accountId && transaction.account !== accountId)) {
    throw new Error("This stored transaction could not be found.")
  }
  return transaction
}

export async function refreshTransactionDetails(
  transactionId: string,
  accountId: string
): Promise<TransactionActionResult> {
  try {
    validateStoredTransaction(transactionId, accountId)
    const transaction = await getTransaction(transactionId, accountId)

    if (transaction.id !== transactionId || transaction.account !== accountId) {
      throw new Error("Redbark returned a different transaction.")
    }

    saveBankTransaction(transaction)
    const storedTransaction = getStoredTransaction(transactionId)
    if (!storedTransaction) {
      throw new Error("The refreshed transaction could not be read back.")
    }
    revalidateTransactionViews()
    return {
      ok: true,
      transaction: applyMerchantLogoRule(storedTransaction),
    }
  } catch (error) {
    return {
      ok: false,
      message: actionError(
        error,
        "Transaction details could not be refreshed."
      ),
    }
  }
}

export async function saveTransactionCategory(
  transactionId: string,
  category: string | null
): Promise<TransactionActionResult> {
  try {
    validateStoredTransaction(transactionId)
    if (category !== null && !TRANSACTION_CATEGORY_VALUES.has(category)) {
      throw new Error("Choose a valid transaction category.")
    }

    getDatabase()
      .update(bankTransactions)
      .set({ customCategory: category, updatedAt: new Date() })
      .where(eq(bankTransactions.transactionId, transactionId))
      .run()

    const transaction = getStoredTransaction(transactionId)
    if (!transaction) {
      throw new Error("The updated transaction could not be read back.")
    }

    revalidateTransactionViews()
    return { ok: true, transaction: applyMerchantLogoRule(transaction) }
  } catch (error) {
    return {
      ok: false,
      message: actionError(
        error,
        "The transaction category could not be saved."
      ),
    }
  }
}

export async function saveTransactionNote(
  transactionId: string,
  markdown: string
): Promise<TransactionActionResult> {
  try {
    validateStoredTransaction(transactionId)
    const noteMarkdown = markdown.replace(/\r\n/g, "\n").trim() || null

    if ((noteMarkdown?.length ?? 0) > MAX_TRANSACTION_NOTE_LENGTH) {
      throw new Error("Transaction notes must be 10,000 characters or fewer.")
    }

    getDatabase()
      .update(bankTransactions)
      .set({ noteMarkdown, updatedAt: new Date() })
      .where(eq(bankTransactions.transactionId, transactionId))
      .run()

    const transaction = getStoredTransaction(transactionId)
    if (!transaction) {
      throw new Error("The updated transaction could not be read back.")
    }

    revalidateTransactionViews()
    return { ok: true, transaction: applyMerchantLogoRule(transaction) }
  } catch (error) {
    return {
      ok: false,
      message: actionError(error, "The transaction note could not be saved."),
    }
  }
}

export async function saveTransactionMerchantCustomisation(
  formData: FormData
): Promise<MerchantCustomisationActionResult> {
  try {
    const transactionId = String(formData.get("transactionId") ?? "")
    const transaction = validateStoredTransaction(transactionId)
    const file = formData.get("logoFile")
    const logoUrl = String(formData.get("logoUrl") ?? "").trim()
    const enteredName = String(formData.get("customName") ?? "").trim()
    const originalName = getMerchantIdentity(transaction).displayName
    const customName =
      enteredName &&
      enteredName.localeCompare(originalName, "en-AU", {
        sensitivity: "base",
      }) !== 0
        ? enteredName
        : null
    let logo: string | undefined

    if (enteredName.length > 120) {
      throw new Error("Merchant names must be 120 characters or fewer.")
    }

    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_LOGO_TYPES.has(file.type)) {
        throw new Error("Use a PNG, JPEG, WebP, GIF or SVG logo.")
      }
      if (file.size > MAX_LOGO_FILE_BYTES) {
        throw new Error("Logo files must be smaller than 750 KB.")
      }

      const encoded = Buffer.from(await file.arrayBuffer()).toString("base64")
      logo = `data:${file.type};base64,${encoded}`
    } else if (logoUrl) {
      if (logoUrl.length > 2_048) throw new Error("This logo URL is too long.")
      const parsedUrl = new URL(logoUrl)
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("Logo URLs must begin with https:// or http://.")
      }
      logo = parsedUrl.toString()
    }

    const saved = saveMerchantRule(transaction, { logo, customName })
    revalidateTransactionViews()

    return {
      ok: true,
      logoUrl: saved.logoUrl,
      customName: saved.customName,
      matchLabel: saved.displayName,
    }
  } catch (error) {
    return {
      ok: false,
      message: actionError(error, "The merchant details could not be saved."),
    }
  }
}

export async function removeTransactionMerchantLogo(
  transactionId: string
): Promise<MerchantCustomisationActionResult> {
  try {
    const transaction = validateStoredTransaction(transactionId)
    const saved = saveMerchantRule(transaction, { logo: null })
    revalidateTransactionViews()
    return {
      ok: true,
      logoUrl: null,
      customName: saved.customName,
      matchLabel: saved.displayName,
    }
  } catch (error) {
    return {
      ok: false,
      message: actionError(error, "The merchant logo could not be removed."),
    }
  }
}
