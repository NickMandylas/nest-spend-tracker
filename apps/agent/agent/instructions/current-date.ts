import { defineDynamic, defineInstructions } from "eve/instructions"

import { dateKey, TIME_ZONE } from "../lib/database"

const humanDateFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

export default defineDynamic({
  events: {
    "turn.started": () => {
      const now = new Date()
      const today = dateKey(now)
      const monthStart = `${today.slice(0, 7)}-01`

      return defineInstructions({
        content: [
          "Current date context:",
          `- Today in ${TIME_ZONE} is ${humanDateFormatter.format(now)} (${today}).`,
          `- Treat \"this month\" as month-to-date: ${monthStart} through ${today}, inclusive.`,
          "- Resolve relative dates such as today, yesterday, this week, last week, this month, and last month from this local date.",
          "- When a finance tool accepts dates, pass the resolved inclusive calendar range explicitly as YYYY-MM-DD dateFrom and dateTo values.",
        ].join("\n"),
      })
    },
  },
})
