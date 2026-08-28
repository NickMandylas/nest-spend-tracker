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
    "Never copy file bytes, base64, data URLs, blob URLs, or attachment contents into OpenUI output or component props. Uploaded files are already displayed by the chat interface. Refer to an attachment by its filename and describe or analyse it in normal text. An OpenUI Image may use a conventional https URL only when an external image is genuinely necessary.",
    "Do not create OpenUI for a simple identification, acknowledgement, or short factual answer. Respond with normal text unless an interactive control, structured comparison, or data visualisation materially improves the answer.",
    "Interactive forms may collect forecast or comparison inputs, but must continue the conversation with @ToAssistant and must never imply that a budget, transaction, account, or database record was changed.",
    "Keep FollowUpBlock concise with no more than three relevant options.",
  ],
})

export default defineInstructions({
  content: openuiPrompt,
})
