import { getMerchantName } from "@/lib/finance"
import type { Transaction } from "@/lib/redbark-types"

export type MerchantIdentity = {
  matchKey: string
  matchKind: "merchant_id" | "merchant_name" | "description"
  matchValue: string
  displayName: string
}

function normaliseMerchantValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function getMerchantIdentity(
  transaction: Transaction
): MerchantIdentity {
  const providerMerchantId = (
    transaction as Transaction & { merchant_id?: string | null }
  ).merchant_id?.trim()

  if (providerMerchantId) {
    return {
      matchKey: `merchant_id:${providerMerchantId.toLowerCase()}`,
      matchKind: "merchant_id",
      matchValue: providerMerchantId,
      displayName: getMerchantName({
        ...transaction,
        custom_merchant_name: null,
      }),
    }
  }

  const merchantName = transaction.merchant_name?.trim()
  if (merchantName) {
    return {
      matchKey: `merchant_name:${normaliseMerchantValue(merchantName)}`,
      matchKind: "merchant_name",
      matchValue: merchantName,
      displayName: getMerchantName({
        ...transaction,
        custom_merchant_name: null,
      }),
    }
  }

  const displayName = getMerchantName({
    ...transaction,
    custom_merchant_name: null,
  })
  return {
    matchKey: `description:${normaliseMerchantValue(displayName)}`,
    matchKind: "description",
    matchValue: displayName,
    displayName,
  }
}
