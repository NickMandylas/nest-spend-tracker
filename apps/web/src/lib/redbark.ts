import "server-only"

import type {
  AccountDetails,
  AccountItem,
  AccountSnapshot,
  Balance,
  FinancialSnapshot,
  RedbarkList,
  Transaction,
} from "@/lib/redbark-types"

const REDBARK_BASE_URL = "https://api.redbark.com/v2/"
const DEFAULT_API_VERSION = "2026-10-01.wattle"
const REQUEST_TIMEOUT_MS = 20_000

type RedbarkAccount = {
  timezone: string
}

type RedbarkErrorBody = {
  error?: {
    code?: string
    message?: string
    request_id?: string
  }
}

export class RedbarkError extends Error {
  code: string | null
  requestId: string | null
  status: number | null

  constructor(
    message: string,
    options: {
      code?: string | null
      requestId?: string | null
      status?: number | null
    } = {}
  ) {
    super(message)
    this.name = "RedbarkError"
    this.code = options.code ?? null
    this.requestId = options.requestId ?? null
    this.status = options.status ?? null
  }
}

function getRedbarkConfig() {
  const apiKey = process.env.REDBARK_API_KEY
  const apiVersion = process.env.REDBARK_API_VERSION ?? DEFAULT_API_VERSION

  if (!apiKey) {
    throw new RedbarkError(
      "Redbark is not configured. Add REDBARK_API_KEY to .env.local."
    )
  }

  return { apiKey, apiVersion }
}

async function redbarkFetch<T>(path: string): Promise<T> {
  const { apiKey, apiVersion } = getRedbarkConfig()
  const url = new URL(path.replace(/^\//, ""), REDBARK_BASE_URL)

  let response: Response

  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Redbark-Version": apiVersion,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Redbark took too long to respond. Try refreshing in a moment."
        : "Redbark could not be reached. Check your connection and try again."

    throw new RedbarkError(message)
  }

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as RedbarkErrorBody | null
    const requestId = body?.error?.request_id ?? response.headers.get("Request-Id")

    throw new RedbarkError(
      body?.error?.message ?? `Redbark returned HTTP ${response.status}.`,
      {
        code: body?.error?.code,
        requestId,
        status: response.status,
      }
    )
  }

  return (await response.json()) as T
}

function recentHistoryStart() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 120)
  return date.toISOString().slice(0, 10)
}

async function getAccountSnapshot(
  account: AccountItem
): Promise<AccountSnapshot> {
  const query = new URLSearchParams({
    account: account.id,
    from: recentHistoryStart(),
    include_pending: "true",
    limit: "100",
  })

  const [balanceResult, detailsResult, transactionsResult] =
    await Promise.allSettled([
      redbarkFetch<Balance>(`accounts/${account.id}/balance`),
      redbarkFetch<AccountDetails>(`accounts/${account.id}/details`),
      redbarkFetch<RedbarkList<Transaction>>(`transactions?${query}`),
    ])

  const warnings: string[] = []

  if (balanceResult.status === "rejected") {
    warnings.push(`${account.name}: live balance unavailable`)
  }

  if (detailsResult.status === "rejected") {
    warnings.push(`${account.name}: account details unavailable`)
  }

  if (transactionsResult.status === "rejected") {
    warnings.push(`${account.name}: transactions unavailable`)
  }

  return {
    account,
    balance:
      balanceResult.status === "fulfilled" ? balanceResult.value : null,
    details:
      detailsResult.status === "fulfilled" ? detailsResult.value : null,
    transactions:
      transactionsResult.status === "fulfilled"
        ? transactionsResult.value.data
        : [],
    warnings,
  }
}

export async function getFinancialSnapshot(): Promise<FinancialSnapshot> {
  const { apiVersion } = getRedbarkConfig()
  const [account, accountList] = await Promise.all([
    redbarkFetch<RedbarkAccount>("me"),
    redbarkFetch<RedbarkList<AccountItem>>("accounts?limit=100"),
  ])

  const accounts = await Promise.all(accountList.data.map(getAccountSnapshot))

  return {
    accounts,
    fetchedAt: new Date().toISOString(),
    timezone: account.timezone || "Australia/Melbourne",
    apiVersion,
  }
}

export async function getTransaction(
  transactionId: string,
  accountId: string
) {
  const query = new URLSearchParams({ account: accountId })
  return redbarkFetch<Transaction>(
    `transactions/${encodeURIComponent(transactionId)}?${query}`
  )
}
