type MerchantRule = {
  customName: string | null
  matchKey: string
}

export function normaliseMerchantText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function merchantMatchKey(transaction: {
  description: string
  merchantName: string | null
  rawTransactionJson?: string
}) {
  if (transaction.rawTransactionJson) {
    try {
      const raw = JSON.parse(transaction.rawTransactionJson) as {
        merchant_id?: unknown
      }
      if (typeof raw.merchant_id === "string" && raw.merchant_id.trim()) {
        return `merchant_id:${raw.merchant_id.trim().toLowerCase()}`
      }
    } catch {
      // Fall through to the stored, non-sensitive transaction fields.
    }
  }

  if (transaction.merchantName?.trim()) {
    return `merchant_name:${normaliseMerchantText(transaction.merchantName)}`
  }

  return `description:${normaliseMerchantText(transaction.description)}`
}

export function merchantLabel(
  transaction: {
    description: string
    merchantName: string | null
    rawTransactionJson?: string
  },
  rules: Map<string, MerchantRule>
) {
  const rule = rules.get(merchantMatchKey(transaction))
  return (
    rule?.customName?.trim() ||
    transaction.merchantName?.trim() ||
    transaction.description.replace(/\s+/g, " ").trim()
  )
}

export function merchantMatches(
  transaction: {
    description: string
    merchantName: string | null
    rawTransactionJson?: string
  },
  rules: Map<string, MerchantRule>,
  query: string
) {
  const needle = normaliseMerchantText(query)
  if (!needle) return true

  return [
    merchantLabel(transaction, rules),
    transaction.merchantName ?? "",
    transaction.description,
  ].some((value) => normaliseMerchantText(value).includes(needle))
}
