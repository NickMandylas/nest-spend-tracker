"use client"

import * as React from "react"

import { FinanceChatShell } from "@/components/finance-chat-shell"

type FinanceChatContextValue = {
  isOpen: boolean
  openChat: () => void
}

const FinanceChatContext = React.createContext<FinanceChatContextValue | null>(
  null
)

export function FinanceChatProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(true)
  const openChat = React.useCallback(() => setIsOpen(true), [])

  const value = React.useMemo(() => ({ isOpen, openChat }), [isOpen, openChat])

  return (
    <FinanceChatContext.Provider value={value}>
      <FinanceChatShell open={isOpen} onClose={() => setIsOpen(false)}>
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
