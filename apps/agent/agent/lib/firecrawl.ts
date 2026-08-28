const FIRECRAWL_API_BASE_URL = "https://api.firecrawl.dev/v2"

type FirecrawlErrorPayload = {
  error?: unknown
  message?: unknown
  success?: unknown
}

function compactError(value: unknown) {
  if (typeof value !== "string") return null

  const message = value.replace(/\s+/g, " ").trim()
  return message ? message.slice(0, 300) : null
}

function payloadError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null

  const candidate = payload as FirecrawlErrorPayload
  return compactError(candidate.error) ?? compactError(candidate.message)
}

function firecrawlApiKey() {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim()

  if (!apiKey) {
    throw new Error(
      "Firecrawl is not configured. Add FIRECRAWL_API_KEY to apps/web/.env.local."
    )
  }

  return apiKey
}

export async function firecrawlPost<T>(
  path: "/search" | "/scrape",
  body: Record<string, unknown>,
  signal?: AbortSignal
) {
  const response = await fetch(`${FIRECRAWL_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })

  const responseText = await response.text()
  let payload: unknown = null

  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      payload = null
    }
  }

  const reportedFailure =
    payload !== null &&
    typeof payload === "object" &&
    (payload as FirecrawlErrorPayload).success === false

  if (!response.ok || reportedFailure) {
    const message =
      payloadError(payload) ??
      compactError(responseText) ??
      "The Firecrawl request failed."
    throw new Error(`Firecrawl request failed (${response.status}): ${message}`)
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Firecrawl returned an invalid response.")
  }

  return payload as T
}

export function clipText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null

  const text = value.trim()
  if (!text) return null
  return text.slice(0, maxLength)
}

function isPrivateIpv4(hostname: string) {
  return (
    /^(?:0|10|127)\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname)
  )
}

export function assertPublicWebUrl(value: string) {
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only public HTTP and HTTPS URLs can be scraped.")
  }
  if (url.username || url.password) {
    throw new Error("URLs containing credentials cannot be scraped.")
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "::1" ||
    hostname.startsWith("fe80:") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error("Local and private-network URLs cannot be scraped.")
  }

  return url.toString()
}
