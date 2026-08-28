export const FINANCE_CHAT_COOKIE_NAME = "nest_finance_chat_open"
export const FINANCE_CHAT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function readFinanceChatOpenPreference(value: string | undefined) {
  return value !== "false"
}
