"use client"

import * as React from "react"

import { FinanceChatShell } from "@/components/finance-chat-shell"
import {
  FINANCE_CHAT_COOKIE_MAX_AGE,
  FINANCE_CHAT_COOKIE_NAME,
} from "@/lib/finance-chat-preferences"

type FinanceChatContextValue = {
  isOpen: boolean
  openChat: () => void
}

const FinanceChatContext = React.createContext<FinanceChatContextValue | null>(
  null
)

export function FinanceChatProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const setChatOpen = React.useCallback((open: boolean) => {
    setIsOpen(open)
    document.cookie = `${FINANCE_CHAT_COOKIE_NAME}=${open}; path=/; max-age=${FINANCE_CHAT_COOKIE_MAX_AGE}; samesite=lax`
  }, [])
  const openChat = React.useCallback(() => setChatOpen(true), [setChatOpen])

  const value = React.useMemo(() => ({ isOpen, openChat }), [isOpen, openChat])

  return (
    <FinanceChatContext.Provider value={value}>
      <FinanceChatShell open={isOpen} onClose={() => setChatOpen(false)}>
        {children}
      </FinanceChatShell>
    </FinanceChatContext.Provider>
  )
}

export function useFinanceChat() {
  const context = React.useContext(FinanceChatContext)

  if (!context) {
    throw new Error("useFinanceChat must be used within FinanceChatProvider")
  }

  return context
}
