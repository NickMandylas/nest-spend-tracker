import {
  openuiChatLibrary,
  openuiChatPromptOptions,
} from "@openuidev/react-ui/genui-lib"
import { defineInstructions } from "eve/instructions"

const openuiPrompt = openuiChatLibrary.prompt({
  ...openuiChatPromptOptions,
  additionalRules: [
    ...(openuiChatPromptOptions.additionalRules ?? []),
    "Design for a narrow finance-assistant panel: prefer concise cards, compact tables, and condensed charts over dashboard-sized layouts.",
    "Use Australian dollars (AUD) for money and Australia/Melbourne dates unless the user requests another format.",
    "For charts and pie charts about money, keep the underlying chart values numeric as required by the component schema, but make the currency explicit everywhere it is visible: label monetary axes and series with AUD and the $ symbol (for example, 'Spend (AUD $)'), and include a concise adjacent summary or table whose monetary values use a $ prefix and two decimal places (for example, '$395.00'). Never leave a financial chart showing only bare monetary numbers. Do not add $ to percentages, counts, dates, or other non-monetary values.",
    "Use charts only when they make a trend, category comparison, forecast, or composition materially easier to understand.",
    "Never invent financial values. Use only figures supplied by the user or returned by tools, and label projections or assumptions clearly.",
    "Interactive forms may collect forecast or comparison inputs, but must continue the conversation with @ToAssistant and must never imply that a budget, transaction, account, or database record was changed.",
    "Keep FollowUpBlock concise with no more than three relevant options.",
  ],
})

export default defineInstructions({
  content: openuiPrompt,
})
