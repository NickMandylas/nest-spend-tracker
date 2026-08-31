import { defineTool } from "eve/tools"
import { z } from "zod"

import { searchTransactionData } from "../lib/transaction-search"

export default defineTool({
  description:
    "Search cached bank transactions by merchant, free text, account name, category, status, and date range. For one or more merchant names, pass them together in merchants; they are ORed and the result includes per-merchant spend totals. Omit accountName, category, and status when unrestricted; common values such as all or any are safely treated as unrestricted. Returns safe display fields only, with custom merchant names applied.",
  inputSchema: z.object({
    query: z.string().trim().optional(),
    merchants: z
      .array(z.string().trim().min(1))
      .max(20)
      .default([])
      .describe(
        "Merchant names to match against display names, provider names, and statement descriptions. Multiple values are ORed."
      ),
    accountName: z
      .string()
      .trim()
      .optional()
      .describe("Optional account filter. Omit for all accounts."),
    category: z
      .string()
      .trim()
      .optional()
      .describe("Optional category filter. Omit for all categories."),
    status: z
      .string()
      .trim()
      .optional()
      .describe("Optional transaction status. Omit for all statuses."),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  execute(input) {
    return searchTransactionData(input)
  },
})
