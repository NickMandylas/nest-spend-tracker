import { defineTool } from "eve/tools"
import { z } from "zod"

import { searchTransactionData } from "../lib/transaction-search"

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export default defineTool({
  description:
    "Get spending totals for one or more merchants over an inclusive date range. Use this tool—not search_transactions—for questions such as how much was spent at Coles, Woolworths, or several named merchants. It has no account, category, status, query, or placeholder filters. Merchant names are ORed, and totals include a posted/pending status breakdown.",
  inputSchema: z.object({
    merchants: z
      .array(z.string().trim().min(1))
      .min(1)
      .max(20)
      .describe("All requested merchant names in one array."),
    dateFrom: date.describe("Inclusive start date in YYYY-MM-DD format."),
    dateTo: date.describe("Inclusive end date in YYYY-MM-DD format."),
  }),
  execute(input) {
    const result = searchTransactionData({
      merchants: input.merchants,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      limit: 100,
    })

    return {
      dateFrom: result.dateFrom,
      dateTo: result.dateTo,
      timezone: result.timezone,
      totalAud: result.spendTotalAud,
      transactionCount: result.spendTransactionCount,
      statusBreakdown: result.statusBreakdown,
      merchantTotals: result.merchantTotals,
    }
  },
})
