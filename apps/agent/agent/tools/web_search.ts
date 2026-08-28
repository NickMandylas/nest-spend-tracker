import { defineTool } from "eve/tools"
import { z } from "zod"

import { clipText, firecrawlPost } from "../lib/firecrawl"

const domainSchema = z
  .string()
  .trim()
  .min(1)
  .max(253)
  .regex(
    /^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i,
    "Use a hostname without a protocol or path, such as abs.gov.au."
  )

const inputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(2)
      .max(500)
      .describe("The public-web search query."),
    limit: z.number().int().min(1).max(10).default(5),
    includeDomains: z
      .array(domainSchema)
      .max(10)
      .optional()
      .describe("Only return results from these public hostnames."),
    excludeDomains: z
      .array(domainSchema)
      .max(10)
      .optional()
      .describe("Exclude results from these public hostnames."),
    category: z
      .enum(["developer", "research", "pdf"])
      .optional()
      .describe("Optionally focus the search on a supported result category."),
    freshness: z
      .enum(["day", "week", "month", "year"])
      .optional()
      .describe("Optionally limit results by recency."),
    country: z
      .string()
      .trim()
      .length(2)
      .default("AU")
      .describe("ISO 3166-1 alpha-2 country code for result relevance."),
  })
  .refine(
    (input) => !(input.includeDomains && input.excludeDomains),
    "Use includeDomains or excludeDomains, not both."
  )

type FirecrawlSearchResult = {
  category?: unknown
  description?: unknown
  metadata?: {
    description?: unknown
    title?: unknown
  } | null
  title?: unknown
  url?: unknown
}

type FirecrawlSearchResponse = {
  data?: {
    web?: FirecrawlSearchResult[]
  }
  success?: boolean
  warning?: unknown
}

const freshnessFilters = {
  day: "qdr:d",
  week: "qdr:w",
  month: "qdr:m",
  year: "qdr:y",
} as const

export default defineTool({
  description:
    "Search the public web with Firecrawl for current or external information. Returns compact source titles, URLs, and descriptions. Never include private household data, account details, credentials, or secrets in the query.",
  inputSchema,
  async execute(input, context) {
    const response = await firecrawlPost<FirecrawlSearchResponse>(
      "/search",
      {
        query: input.query,
        limit: input.limit,
        sources: ["web"],
        ...(input.includeDomains
          ? { includeDomains: input.includeDomains }
          : {}),
        ...(input.excludeDomains
          ? { excludeDomains: input.excludeDomains }
          : {}),
        ...(input.category ? { categories: [{ type: input.category }] } : {}),
        ...(input.freshness ? { tbs: freshnessFilters[input.freshness] } : {}),
        country: input.country.toUpperCase(),
        safe: true,
        highlights: true,
        ignoreInvalidURLs: true,
        timeout: 30_000,
      },
      context.abortSignal
    )

    const results = (response.data?.web ?? [])
      .slice(0, input.limit)
      .flatMap((result) => {
        const url = clipText(result.url, 2_048)
        if (!url) return []

        return [
          {
            title:
              clipText(result.title, 300) ??
              clipText(result.metadata?.title, 300) ??
              url,
            url,
            description:
              clipText(result.description, 1_000) ??
              clipText(result.metadata?.description, 1_000),
            category: clipText(result.category, 100),
          },
        ]
      })

    return {
      query: input.query,
      resultCount: results.length,
      results,
      warning: clipText(response.warning, 500),
    }
  },
})
